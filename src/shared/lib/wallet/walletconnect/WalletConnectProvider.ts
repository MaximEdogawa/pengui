import type SignClient from "@walletconnect/sign-client";
import { SageMethods } from "@/shared/lib/walletConnect/constants/sage-methods";
import {
  cancelOffer,
  createOffer,
  getAssetBalance,
  getAssetCoins,
  getWalletAddress,
  makeWalletRequest,
  sendTransaction as sendXchTransaction,
  signCoinSpends as signCoinSpendsRequest,
  signMessage as signMessageRequest,
  takeOffer,
} from "@/shared/lib/walletConnect/repositories/walletQueries.repository";
import type { WalletConnectSession } from "@/shared/lib/walletConnect/types/walletConnect.types";
import { chainIdToNetwork } from "@/shared/lib/utils/networkUtils";
import type {
  AssetBalance,
  AssetCoins,
  AssetType,
  CancelOfferRequest,
  CancelOfferResponse,
  GetPublicKeysRequest,
  OfferRequest,
  OfferResponse,
  SendSpendBundleRequest,
  SendSpendBundleResponse,
  SignCoinSpendsRequest,
  SignMessageRequest,
  SignMessageResponse,
  SpendBundle,
  TakeOfferRequest,
  TakeOfferResponse,
  TransactionRequest,
  TransactionResponse,
  WalletConnectOptions,
  WalletNetwork,
  WalletPingOptions,
  WalletProvider,
  WalletResult,
  WalletState,
  WalletStateListener,
} from "../types";
import { createWalletStateStore, DISCONNECTED_WALLET_STATE } from "../walletStateStore";

/**
 * Everything the adapter needs from React, refreshed on every render by
 * {@link WalletConnectRuntime}. Kept behind a getter so provider methods always
 * read the current SignClient and session without the provider identity ever
 * changing.
 */
export interface WalletConnectBindings {
  signClient: SignClient | undefined;
  session: WalletConnectSession;
  network: WalletNetwork;
}

/** WalletConnect can do every wallet operation Pengui needs. */
export const WALLET_CONNECT_CAPABILITIES = {
  createOffer: true,
  takeOffer: true,
  cancelOffer: true,
  sendXch: true,
  signCoinSpends: true,
  signMessage: true,
  switchNetwork: true,
} as const;

export const INITIAL_WALLET_CONNECT_STATE: WalletState = {
  ...DISCONNECTED_WALLET_STATE,
  kind: "walletconnect",
  capabilities: { ...WALLET_CONNECT_CAPABILITIES },
};

function notConnected<T>(): WalletResult<T> {
  return { success: false, error: "Wallet is not connected", code: "not-connected" };
}

/** The WalletConnect adapter, plus the state setter its React runtime uses. */
export interface WalletConnectWalletProvider extends WalletProvider {
  /** Publish a new state snapshot to imperative subscribers. */
  setState(next: WalletState): void;
}

/**
 * Wrap the existing WalletConnect repository, SignClient and redux session in
 * the provider-agnostic {@link WalletProvider} interface.
 *
 * This is a pass-through by design: every method forwards to
 * `walletQueries.repository` with the same RPC name, the same parameters and
 * the same result handling as before the abstraction existed.
 */
export function createWalletConnectProvider(
  getBindings: () => WalletConnectBindings
): WalletConnectWalletProvider {
  const store = createWalletStateStore(INITIAL_WALLET_CONNECT_STATE);

  const requireSession = (): WalletConnectSession | null => {
    const { session } = getBindings();
    return session.isConnected ? session : null;
  };

  return {
    kind: "walletconnect",

    getState(): WalletState {
      return store.getState();
    },

    subscribe(listener: WalletStateListener): () => void {
      return store.subscribe(listener);
    },

    setState(next: WalletState): void {
      store.setState(next);
    },

    async initialize(): Promise<void> {
      // The SignClient is created and cached by `useWalletConnectSignClient`;
      // nothing else has to happen up front for WalletConnect.
    },

    async connect(options: WalletConnectOptions = {}): Promise<WalletResult<WalletState>> {
      const { connectWalletConnect } = await import("./connectWalletConnect");
      const outcome = await connectWalletConnect({
        onPairingUri: (uri) => {
          if (uri) options.onPairingUri?.(uri);
        },
      });

      switch (outcome.status) {
        case "connected":
          // The React runtime publishes the new state on the next commit.
          return { success: true, data: store.getState() };
        case "rejected":
          return { success: false, error: "Connection was rejected in the wallet" };
        case "unavailable":
          return { success: false, error: "WalletConnect is unavailable", code: "request-failed" };
        case "cancelled":
          return { success: false, error: "Connection cancelled" };
        default:
          return { success: false, error: outcome.error, code: "request-failed" };
      }
    },

    async disconnect(): Promise<WalletResult<void>> {
      const { disconnectWallet } = await import("@/shared/lib/walletConnect/disconnectWallet");
      try {
        await disconnectWallet();
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          code: "request-failed",
        };
      }
    },

    async ping(options: WalletPingOptions = {}): Promise<WalletResult<boolean>> {
      const { signClient, session } = getBindings();
      if (!signClient || !session.isConnected || !session.topic) {
        return notConnected<boolean>();
      }

      const activeSessions = signClient.session.getAll();
      const activeSession = activeSessions.find((s) => s.topic === session.topic);
      if (!activeSession) {
        return {
          success: false,
          error: "Session no longer exists locally",
          code: "session-missing",
        };
      }

      try {
        const pingPromise = signClient.ping({ topic: session.topic });
        if (options.timeoutMs === undefined) {
          await pingPromise;
        } else {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Ping timeout")), options.timeoutMs)
          );
          await Promise.race([pingPromise, timeoutPromise]);
        }
        return { success: true, data: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          code: "request-failed",
        };
      }
    },

    async getNetwork(): Promise<WalletResult<WalletNetwork>> {
      const { session, network } = getBindings();
      // WalletConnect has no network RPC: the session chain id is the source of
      // truth when connected, otherwise the app preference is.
      if (session.isConnected && session.chainId) {
        return { success: true, data: chainIdToNetwork(session.chainId) };
      }
      return { success: true, data: network };
    },

    async getAddress(): Promise<WalletResult<{ address: string }>> {
      const { signClient } = getBindings();
      const session = requireSession();
      if (!session) return notConnected<{ address: string }>();
      return getWalletAddress(signClient, session);
    },

    async getAssetBalance(
      type: AssetType | null = null,
      assetId: string | null = null
    ): Promise<WalletResult<AssetBalance | null>> {
      const { signClient } = getBindings();
      const session = requireSession();
      if (!session) return notConnected<AssetBalance | null>();
      return getAssetBalance(signClient, session, type, assetId);
    },

    async getAssetCoins(
      type: AssetType | null = null,
      assetId: string | null = null
    ): Promise<WalletResult<AssetCoins | null>> {
      const { signClient } = getBindings();
      const session = requireSession();
      if (!session) return notConnected<AssetCoins | null>();
      return getAssetCoins(signClient, session, type, assetId);
    },

    async getPublicKeys(request: GetPublicKeysRequest = {}): Promise<WalletResult<string[]>> {
      const { signClient } = getBindings();
      const session = requireSession();
      if (!session) return notConnected<string[]>();
      return makeWalletRequest<string[]>(
        SageMethods.CHIP0002_GET_PUBLIC_KEYS,
        { ...request },
        signClient,
        session
      );
    },

    async sendXch(request: TransactionRequest): Promise<WalletResult<TransactionResponse>> {
      const { signClient } = getBindings();
      const session = requireSession();
      if (!session) return notConnected<TransactionResponse>();
      return sendXchTransaction(request, signClient, session);
    },

    async signCoinSpends(request: SignCoinSpendsRequest): Promise<WalletResult<SpendBundle>> {
      const { signClient } = getBindings();
      const session = requireSession();
      if (!session) return notConnected<SpendBundle>();

      const result = await signCoinSpendsRequest(
        { walletId: request.walletId, coinSpends: request.coinSpends },
        signClient,
        session
      );

      if (!result.success) {
        return { success: false, error: result.error, code: "request-failed" };
      }

      // CHIP-0002 wallets answer with the signed coin spends; some wrap a bare
      // aggregated signature instead. Either way the caller gets a bundle.
      return {
        success: true,
        data: {
          coin_spends: Array.isArray(result.data) ? result.data : request.coinSpends,
          aggregated_signature: extractAggregatedSignature(result.data),
        },
      };
    },

    async sendTransaction(
      request: SendSpendBundleRequest
    ): Promise<WalletResult<SendSpendBundleResponse>> {
      const { signClient } = getBindings();
      const session = requireSession();
      if (!session) return notConnected<SendSpendBundleResponse>();
      return makeWalletRequest<SendSpendBundleResponse>(
        SageMethods.CHIP0002_SEND_TRANSACTION,
        { spendBundle: request.spendBundle },
        signClient,
        session
      );
    },

    async signMessage(request: SignMessageRequest): Promise<WalletResult<SignMessageResponse>> {
      const { signClient } = getBindings();
      const session = requireSession();
      if (!session) return notConnected<SignMessageResponse>();
      return signMessageRequest(request, signClient, session);
    },

    async createOffer(request: OfferRequest): Promise<WalletResult<OfferResponse>> {
      const { signClient } = getBindings();
      const session = requireSession();
      if (!session) return notConnected<OfferResponse>();
      return createOffer(request, signClient, session);
    },

    async takeOffer(request: TakeOfferRequest): Promise<WalletResult<TakeOfferResponse>> {
      const { signClient } = getBindings();
      const session = requireSession();
      if (!session) return notConnected<TakeOfferResponse>();
      return takeOffer(request, signClient, session);
    },

    async cancelOffer(request: CancelOfferRequest): Promise<WalletResult<CancelOfferResponse>> {
      const { signClient } = getBindings();
      const session = requireSession();
      if (!session) return notConnected<CancelOfferResponse>();
      return cancelOffer(request, signClient, session);
    },
  };
}

/**
 * Pull the aggregated signature out of a CHIP-0002 `signCoinSpends` response.
 * Wallets differ: Sage returns the signed coin spends, others answer with a
 * bare signature string or wrap it in an object.
 */
function extractAggregatedSignature(data: unknown): string {
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    for (const key of ["aggregated_signature", "aggregatedSignature", "signature"]) {
      const value = record[key];
      if (typeof value === "string") return value;
    }
  }
  return "";
}
