import { getSageClient, type SageClient } from "sage-app-sdk";
import type {
  AssetBalance,
  AssetCoins,
  CancelOfferResponse,
  GetPublicKeysRequest,
  GetTransactionsRequest,
  OfferResponse,
  SendSpendBundleRequest,
  SendSpendBundleResponse,
  SignCoinSpendsRequest,
  SignMessageRequest,
  SignMessageResponse,
  SpendBundle,
  TakeOfferResponse,
  TransactionRequest,
  TransactionResponse,
  WalletDisconnectOptions,
  WalletNetwork,
  WalletPingOptions,
  WalletProvider,
  WalletResult,
  WalletState,
  WalletStateListener,
  WalletTransactionRecord,
} from "../types";
import { createWalletStateStore, DISCONNECTED_WALLET_STATE } from "../walletStateStore";
import {
  computeSageWalletCapabilities,
  mapSageAssetCoins,
  mapSageNetwork,
  mapSageTransactions,
  SAGE_OPTIONAL_CAPABILITIES,
  SAGE_REQUIRED_CAPABILITIES,
} from "./sageMappers";

export const INITIAL_SAGE_BRIDGE_STATE: WalletState = {
  ...DISCONNECTED_WALLET_STATE,
  kind: "sage-bridge",
};

const OFFERS_UNSUPPORTED =
  "Offers are not yet available inside Sage. The client-side offer builder lands with TASK-001.04.";

function unsupported<T>(error = OFFERS_UNSUPPORTED): WalletResult<T> {
  return { success: false, error, code: "unsupported" };
}

function notConnected<T>(): WalletResult<T> {
  return { success: false, error: "Sage bridge is not ready", code: "not-connected" };
}

function requestFailed<T>(error: unknown): WalletResult<T> {
  return {
    success: false,
    error: error instanceof Error ? error.message : String(error),
    code: "request-failed",
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs?: number): Promise<T> {
  if (timeoutMs === undefined) return promise;
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Sage bridge call timed out")), timeoutMs)
    ),
  ]);
}

/** Resolve a public key for an address by scanning derivations, unhardened then hardened. */
async function resolvePublicKeyForAddress(
  client: SageClient,
  address: string
): Promise<string | undefined> {
  for (const hardened of [false, true]) {
    try {
      const { derivations } = await client.wallet.getDerivations({ hardened, offset: 0, limit: 100 });
      const match = derivations.find((derivation) => derivation.address === address);
      if (match) return match.public_key;
    } catch {
      // Capability not granted, or the address is not among the first 100
      // derivations in this mode; try the next mode / give up.
    }
  }
  return undefined;
}

/** Extra surface `SageBridgeRuntime` needs beyond the public `WalletProvider`. */
export interface SageBridgeWalletProvider extends WalletProvider {
  /** Publish a new state snapshot to imperative subscribers. */
  setState(next: WalletState): void;
  /** The resolved Sage client, once `initialize()`/`connect()` has run. */
  getSageClient(): SageClient | null;
  /** Currently granted capability strings, refreshed by `initialize()`/`connect()` and change events. */
  getGrantedCapabilities(): readonly string[];
}

export interface SageBridgeAdapterDeps {
  /** Resolve the Sage client. Defaults to `getSageClient` from `sage-app-sdk`; overridable for tests. */
  getClient?: () => Promise<SageClient>;
}

/**
 * The Sage bridge adapter: `WalletProvider` implemented on top of the
 * published `sage-app-sdk` client (`initSageRuntimeBridge` / `getSageClient`),
 * no polling and no raw Tauri invokes of Sage-internal commands. See
 * pengui-wiki/architecture/sage-in-app-integration.md, "Wallet operation
 * mapping".
 */
export function createSageBridgeProvider(
  deps: SageBridgeAdapterDeps = {}
): SageBridgeWalletProvider {
  const getClient = deps.getClient ?? getSageClient;
  const store = createWalletStateStore(INITIAL_SAGE_BRIDGE_STATE);

  let client: SageClient | null = null;
  let granted: string[] = [];
  let initPromise: Promise<void> | null = null;

  async function refreshGrantedCapabilities(activeClient: SageClient): Promise<void> {
    try {
      granted = await activeClient.app.getCapabilities();
    } catch {
      granted = activeClient.initialAppInfo?.capabilities ?? [];
    }
  }

  async function refreshConnectionState(activeClient: SageClient): Promise<void> {
    const [keyResult, syncResult, networkResult] = await Promise.allSettled([
      activeClient.wallet.getKey({}),
      activeClient.wallet.getSyncStatus(),
      activeClient.environment.getNetwork(),
    ]);

    const key = keyResult.status === "fulfilled" ? keyResult.value.key : null;
    const address =
      syncResult.status === "fulfilled" ? syncResult.value.receive_address || null : null;
    const network: WalletNetwork =
      networkResult.status === "fulfilled"
        ? mapSageNetwork(networkResult.value)
        : store.getState().network;

    store.setState({
      kind: "sage-bridge",
      isConnected: key != null,
      isReady: key != null,
      fingerprint: key?.fingerprint ?? null,
      address,
      network,
      walletName: key?.name ?? null,
      capabilities: computeSageWalletCapabilities(granted),
    });
  }

  /** Request every capability in `capabilities` that is not granted yet. Best effort, one at a time. */
  async function requestMissingCapabilities(
    activeClient: SageClient,
    capabilities: readonly string[]
  ): Promise<void> {
    for (const capability of capabilities) {
      if (granted.includes(capability)) continue;
      try {
        const result = await activeClient.app.requestCapabilityGrant({
          capability: capability as Parameters<
            SageClient["app"]["requestCapabilityGrant"]
          >[0]["capability"],
        });
        granted = result.fullGrantedCapabilities;
      } catch {
        // Denied or unavailable; move on so one rejection doesn't block the rest.
      }
    }
  }

  function registerEventListeners(activeClient: SageClient): void {
    activeClient.app.onGrantedCapabilitiesChange((event) => {
      granted = event.full;
      void refreshConnectionState(activeClient);
    });

    // Not wrapped by sage-app-sdk 0.13.0's typed client, but the SDK still
    // re-dispatches every runtime event it receives on `window` as
    // `sage:event:<type>` (pengui-wiki/architecture/sage-in-app-integration.md),
    // so a plain listener works without needing a raw bridge call.
    if (typeof window !== "undefined") {
      window.addEventListener("sage:event:wallet.selectedWallet.changed", () => {
        void refreshConnectionState(activeClient);
      });
    }

    // Registering any handler makes the SDK request lifecycle notifications
    // and acknowledge `app.lifecycle.readyToStop` once this resolves.
    activeClient.app.lifecycle.onBeforeStop(() => {
      // Nothing to flush today: offers persist to IndexedDB as they change,
      // not on shutdown.
    });
  }

  async function ensureInitialized(): Promise<SageClient> {
    if (!initPromise) {
      initPromise = (async () => {
        const resolved = await getClient();
        client = resolved;
        await refreshGrantedCapabilities(resolved);
        registerEventListeners(resolved);
        await refreshConnectionState(resolved);
      })().catch((error) => {
        initPromise = null; // allow retrying after a failed attempt
        throw error;
      });
    }
    await initPromise;
    if (!client) throw new Error("Sage bridge client unavailable after initialize()");
    return client;
  }

  return {
    kind: "sage-bridge",

    getState: (): WalletState => store.getState(),
    subscribe: (listener: WalletStateListener) => store.subscribe(listener),
    setState: (next: WalletState) => store.setState(next),
    getSageClient: () => client,
    getGrantedCapabilities: () => granted,

    async initialize(): Promise<void> {
      await ensureInitialized();
    },

    async connect(): Promise<WalletResult<WalletState>> {
      let activeClient: SageClient;
      try {
        activeClient = await ensureInitialized();
      } catch (error) {
        return requestFailed<WalletState>(error);
      }

      await requestMissingCapabilities(activeClient, [
        ...SAGE_REQUIRED_CAPABILITIES,
        ...SAGE_OPTIONAL_CAPABILITIES,
      ]);
      await refreshConnectionState(activeClient);

      const state = store.getState();
      if (!state.isConnected) {
        return {
          success: false,
          error: "Sage did not grant wallet.get_key. Check the app's permissions.",
          code: "not-connected",
        };
      }
      return { success: true, data: state };
    },

    async disconnect(_options?: WalletDisconnectOptions): Promise<WalletResult<void>> {
      // There is no disconnect inside Sage: the wallet is the host.
      return { success: true };
    },

    async ping(options: WalletPingOptions = {}): Promise<WalletResult<boolean>> {
      if (!client) return notConnected<boolean>();
      try {
        const result = await withTimeout(client.app.bridgePing(), options.timeoutMs);
        return { success: true, data: !!result.ok };
      } catch (error) {
        return requestFailed<boolean>(error);
      }
    },

    async getNetwork(): Promise<WalletResult<WalletNetwork>> {
      if (!client) return notConnected<WalletNetwork>();
      try {
        const result = await client.environment.getNetwork();
        return { success: true, data: mapSageNetwork(result) };
      } catch (error) {
        return requestFailed<WalletNetwork>(error);
      }
    },

    async getAddress(): Promise<WalletResult<{ address: string }>> {
      if (!client) return notConnected<{ address: string }>();
      try {
        const status = await client.wallet.getSyncStatus();
        if (!status.receive_address) {
          return { success: false, error: "No receive address available", code: "request-failed" };
        }
        return { success: true, data: { address: status.receive_address } };
      } catch (error) {
        return requestFailed<{ address: string }>(error);
      }
    },

    async getAssetBalance(
      type = null,
      assetId = null
    ): Promise<WalletResult<AssetBalance | null>> {
      if (!client) return notConnected<AssetBalance | null>();
      try {
        const result = await client.wallet.getAssetBalance({
          type: type ?? undefined,
          assetId: assetId ?? undefined,
        });
        return { success: true, data: result };
      } catch (error) {
        return requestFailed<AssetBalance | null>(error);
      }
    },

    async getAssetCoins(type = null, assetId = null): Promise<WalletResult<AssetCoins | null>> {
      if (!client) return notConnected<AssetCoins | null>();
      try {
        const result = await client.wallet.getAssetCoins({
          type: type ?? undefined,
          assetId: assetId ?? undefined,
        });
        return { success: true, data: mapSageAssetCoins(result) };
      } catch (error) {
        return requestFailed<AssetCoins | null>(error);
      }
    },

    async getPublicKeys(request: GetPublicKeysRequest = {}): Promise<WalletResult<string[]>> {
      if (!client) return notConnected<string[]>();
      try {
        const result = await client.wallet.getPublicKeys({
          limit: request.limit,
          offset: request.offset,
          hardened: request.hardened,
        });
        return { success: true, data: result };
      } catch (error) {
        return requestFailed<string[]>(error);
      }
    },

    async getTransactions(
      request: GetTransactionsRequest = {}
    ): Promise<WalletResult<WalletTransactionRecord[]>> {
      if (!client) return notConnected<WalletTransactionRecord[]>();
      try {
        const result = await client.wallet.getTransactions({
          offset: request.offset ?? 0,
          limit: request.limit ?? 50,
          ascending: request.ascending ?? false,
          find_value: request.findValue ?? null,
        });
        return { success: true, data: mapSageTransactions(result) };
      } catch (error) {
        return requestFailed<WalletTransactionRecord[]>(error);
      }
    },

    async sendXch(request: TransactionRequest): Promise<WalletResult<TransactionResponse>> {
      if (!client) return notConnected<TransactionResponse>();
      try {
        const extra = request as Record<string, unknown>;
        const result = await client.wallet.sendXch({
          address: request.address,
          amount: String(Math.trunc(request.amount)),
          fee: String(Math.trunc(request.fee ?? 0)),
          memos: request.memos,
          clawback: typeof extra.clawback === "number" ? extra.clawback : undefined,
        });
        const transactionId =
          result.summary.inputs[0]?.coin_id ??
          (typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `sage-${Date.now()}`);
        return {
          success: true,
          data: {
            transactionId,
            transaction: { summary: result.summary, coin_spends: result.coin_spends },
          },
        };
      } catch (error) {
        return requestFailed<TransactionResponse>(error);
      }
    },

    async signCoinSpends(request: SignCoinSpendsRequest): Promise<WalletResult<SpendBundle>> {
      if (!client) return notConnected<SpendBundle>();
      try {
        const aggregatedSignature = await client.wallet.signCoinSpends({
          coinSpends: request.coinSpends,
          partialSign: request.partialSign ?? false,
        });
        return {
          success: true,
          data: { coin_spends: request.coinSpends, aggregated_signature: aggregatedSignature },
        };
      } catch (error) {
        return requestFailed<SpendBundle>(error);
      }
    },

    async sendTransaction(
      request: SendSpendBundleRequest
    ): Promise<WalletResult<SendSpendBundleResponse>> {
      if (!client) return notConnected<SendSpendBundleResponse>();
      try {
        const result = await client.wallet.sendTransaction({ spendBundle: request.spendBundle });
        return { success: true, data: { status: result.status, error: result.error } };
      } catch (error) {
        return requestFailed<SendSpendBundleResponse>(error);
      }
    },

    async signMessage(request: SignMessageRequest): Promise<WalletResult<SignMessageResponse>> {
      if (!client) return notConnected<SignMessageResponse>();
      try {
        const explicitPublicKey = (request as Record<string, unknown>).publicKey;
        let publicKey = typeof explicitPublicKey === "string" ? explicitPublicKey : undefined;

        if (!publicKey && request.address) {
          publicKey = await resolvePublicKeyForAddress(client, request.address);
        }
        if (!publicKey) {
          const keyResult = await client.wallet.getKey({});
          publicKey = keyResult.key?.public_key;
        }
        if (!publicKey) {
          return {
            success: false,
            error: "No public key available to sign with. Sage signs by public key, not address.",
            code: "invalid-request",
          };
        }

        const signature = await client.wallet.signMessage({ message: request.message, publicKey });
        return {
          success: true,
          data: {
            signature,
            message: request.message,
            address: request.address ?? store.getState().address ?? "",
          },
        };
      } catch (error) {
        return requestFailed<SignMessageResponse>(error);
      }
    },

    async createOffer(): Promise<WalletResult<OfferResponse>> {
      return unsupported<OfferResponse>();
    },
    async takeOffer(): Promise<WalletResult<TakeOfferResponse>> {
      return unsupported<TakeOfferResponse>();
    },
    async cancelOffer(): Promise<WalletResult<CancelOfferResponse>> {
      return unsupported<CancelOfferResponse>();
    },
  };
}
