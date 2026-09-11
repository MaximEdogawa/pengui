/**
 * Mock Sage bridge for unit, integration and component tests (TASK-001.05).
 *
 * Builds a fake that has the exact shape of `sage-app-sdk`'s `SageClient`
 * (type-checked against the imported type, so an SDK upgrade that changes the
 * surface fails to compile here) and installs it where the real code looks:
 *
 * - `window.__SAGE__` — what `getSageClient()` from `sage-app-sdk` returns
 *   without ever calling `initSageRuntimeBridge()` (the SDK short-circuits on
 *   an existing `window.__SAGE__`), so `createSageBridgeProvider()` with its
 *   default deps talks to the mock through the real SDK entry point.
 * - `globalThis.__TAURI__` / `window.__TAURI__` — what `detectWalletRuntime()`
 *   and the SDK's `isSageRuntimeAvailable()` probe for.
 *
 * Everything the host would decide is scripted through {@link MockSageBridgeOptions}:
 * granted capabilities, network id, the active key, per-asset balances and
 * coins, transaction history, theme, and the outcome of every approval dialog
 * (`accept`, `reject`, `timeout`). Every bridge call is recorded in `calls`.
 *
 * Usage (bun test):
 *
 * ```ts
 * const sage = installMockSageBridge({ networkId: "testnet11", approvals: { sendXch: "reject" } });
 * try {
 *   const provider = createSageBridgeProvider();
 *   await provider.connect();
 *   ...
 * } finally {
 *   sage.uninstall();
 * }
 * ```
 */
import type {
  AppGetInfoResult,
  BeforeStopEvent,
  DerivationRecord,
  EnvironmentGetNetworkResult,
  EnvironmentThemeChangedEvent,
  EnvironmentThemeView,
  GetSyncStatusResponse,
  GrantedCapabilitiesChangeEvent,
  KeyInfo,
  SageAppClient,
  SageClient,
  SageEnvironmentClient,
  SageWalletClient,
  TransactionRecord,
  UserBridgeCapability,
  WalletGetAssetBalanceResult,
  WalletSpendableAssetCoin,
} from "sage-app-sdk";

/** How a scripted Sage approval dialog (or any approval-gated call) resolves. */
export type MockSageApprovalOutcome = "accept" | "reject" | "timeout";

/** Bridge calls that open an approval dialog in a real Sage host. */
export type MockSageApprovalMethod =
  | "capabilityGrant"
  | "sendXch"
  | "signCoinSpends"
  | "signMessage"
  | "sendTransaction";

export type MockSageApprovals = Partial<Record<MockSageApprovalMethod, MockSageApprovalOutcome>>;

/** A scripted asset: its balance and the spendable coins `wallet.getAssetCoins` returns. */
export interface MockSageAsset {
  /** `undefined`/`null` = XCH, otherwise the CAT/NFT/DID type. */
  type?: "cat" | "did" | "nft" | null;
  assetId?: string | null;
  balance?: Partial<WalletGetAssetBalanceResult>;
  coins?: WalletSpendableAssetCoin[];
}

export interface MockSageBridgeOptions {
  /** Capabilities granted at install time (the manifest's required set by default). */
  capabilities?: readonly string[];
  /**
   * Capabilities a `requestCapabilityGrant` may add. Defaults to every
   * capability, mirroring a host whose user approves all optional grants.
   * Anything not listed is answered with `granted: false`.
   */
  grantable?: readonly string[];
  /** Sage's network id: `mainnet`, `testnet11`, or any custom id. */
  networkId?: string;
  /** Active key; `null` reproduces Sage 0.13 answering `getKey` with `key: null`. */
  key?: Partial<KeyInfo> | null;
  /** Receive address from `wallet.getSyncStatus`; `null`/empty = not synced yet. */
  receiveAddress?: string | null;
  /** Balances and coins per asset. XCH with a single 1 XCH coin by default. */
  assets?: MockSageAsset[];
  transactions?: TransactionRecord[];
  publicKeys?: string[];
  derivations?: DerivationRecord[];
  theme?: Partial<EnvironmentThemeView>;
  xchUsdPrice?: number;
  /** Outcome per approval-gated call; `accept` for anything not listed. */
  approvals?: MockSageApprovals;
  /**
   * How long a `timeout` outcome waits before rejecting with the SDK's own
   * `timeout for <method>` error (the real SDK waits 30 s). `null` never settles,
   * for tests that bring their own timeout (e.g. `provider.ping({ timeoutMs })`).
   */
  approvalTimeoutMs?: number | null;
  /** Error message a `reject` outcome throws with. */
  rejectionMessage?: string;
  /** Aggregated signature `wallet.signCoinSpends` returns on accept. */
  aggregatedSignature?: string;
  /** Signature `wallet.signMessage` returns on accept. */
  messageSignature?: string;
  /** Status `wallet.sendTransaction` returns on accept (1 = SUCCESS in Chia's mempool codes). */
  sendTransactionStatus?: number;
  /** App id/name reported through `initialAppInfo` / `bridgePing`. */
  appId?: string;
  appName?: string;
}

export interface MockSageCall {
  /** Bridge method in camelCase, e.g. `wallet.getAssetBalance`. */
  method: string;
  params: unknown;
}

export interface MockSageClientHandle {
  /** The fake, typed as the real `SageClient`. */
  client: SageClient;
  /** Every bridge call made so far, in order. */
  calls: MockSageCall[];
  /** Params of every call to `method`. */
  callsTo(method: string): unknown[];
  /** Currently granted capability strings. */
  grantedCapabilities(): string[];
  /** Grant capabilities from the host side and notify `onGrantedCapabilitiesChange` listeners. */
  grantCapabilities(...capabilities: string[]): void;
  /** Revoke capabilities from the host side and notify listeners. */
  revokeCapabilities(...capabilities: string[]): void;
  /** Change the active key; the next `getKey` sees it. */
  setKey(key: Partial<KeyInfo> | null): void;
  /**
   * Simulate the user switching wallets in Sage: sets the key and dispatches
   * the `sage:event:wallet.selectedWallet.changed` window event the SDK
   * re-dispatches for every runtime event.
   */
  selectWallet(key: Partial<KeyInfo> | null): void;
  setReceiveAddress(address: string | null): void;
  setNetworkId(networkId: string): void;
  /** Change the theme and notify `environment.theme.onChanged` listeners. */
  setTheme(theme: Partial<EnvironmentThemeView>): void;
  /** Re-script an approval outcome after install. */
  setApproval(method: MockSageApprovalMethod, outcome: MockSageApprovalOutcome): void;
  /** Fire `app.lifecycle.onBeforeStop` handlers; resolves once every handler settled. */
  emitBeforeStop(requestId?: string): Promise<void>;
  /** Handlers currently registered through `lifecycle.onBeforeStop`. */
  beforeStopHandlerCount(): number;
}

export interface MockSageBridgeHandle extends MockSageClientHandle {
  /** Remove `window.__SAGE__` and the Tauri globals again. */
  uninstall(): void;
}

/** The capability set `sage-manifest.json` marks as required. */
export const MOCK_SAGE_DEFAULT_CAPABILITIES: readonly UserBridgeCapability[] = [
  "app.get_capabilities",
  "app.request_capability_grant",
  "environment.get_network",
  "wallet.get_key",
  "wallet.get_sync_status",
  "wallet.get_asset_balance",
  "wallet.get_asset_coins",
];

/** Every capability `sage-app-sdk` 0.13.0 knows about. */
export const MOCK_SAGE_ALL_CAPABILITIES: readonly UserBridgeCapability[] = [
  "bridge.send",
  "app.get_info",
  "app.lifecycle.ready_to_stop",
  "app.lifecycle.set_before_stop_listener",
  "app.get_capabilities",
  "app.request_capability_grant",
  "app.request_network_whitelist_grant",
  "wallet.get_key",
  "wallet.get_secret_key",
  "wallet.send_xch",
  "wallet.send_xch_auto_submit",
  "wallet.get_sync_status",
  "wallet.get_version",
  "wallet.get_xch_usd_price",
  "wallet.check_address",
  "wallet.filter_unlocked_coins",
  "wallet.get_asset_coins",
  "wallet.get_asset_balance",
  "wallet.sign_coin_spends",
  "wallet.sign_message",
  "wallet.send_transaction",
  "wallet.get_public_keys",
  "wallet.get_derivations",
  "wallet.get_spendable_coin_count",
  "wallet.get_coins_by_ids",
  "wallet.get_coins",
  "wallet.get_pending_transactions",
  "wallet.get_transaction",
  "wallet.get_transactions",
  "environment.theme.get_current",
  "environment.theme.css_vars",
  "environment.theme.listen_changed",
  "environment.get_network",
  "storage.persistent_webview",
];

export const MOCK_SAGE_KEY: KeyInfo = {
  name: "Mock Wallet",
  fingerprint: 987654321,
  public_key: `aa${"11".repeat(47)}`,
  kind: "bls",
  has_secrets: true,
  network_id: "mainnet",
  emoji: null,
};

export const MOCK_SAGE_RECEIVE_ADDRESS =
  "xch1mockreceiveaddress000000000000000000000000000000000000000";

export const MOCK_SAGE_XCH_COIN: WalletSpendableAssetCoin = {
  coin: {
    parent_coin_info: `0x${"01".repeat(32)}`,
    puzzle_hash: `0x${"02".repeat(32)}`,
    amount: "1000000000000",
  },
  coinName: `0x${"03".repeat(32)}`,
  puzzle: `0x${"04".repeat(16)}`,
  confirmedBlockIndex: 4_200_000,
  locked: false,
  lineageProof: null,
};

const DEFAULT_THEME: EnvironmentThemeView = {
  name: "dark",
  displayName: "Dark",
  mostLike: "dark",
  cssVars: {},
};

const NETWORK_PRESETS: Record<string, Omit<EnvironmentGetNetworkResult, "networkId">> = {
  mainnet: { name: "Mainnet", kind: "mainnet", ticker: "XCH", prefix: "xch", precision: 12 },
  testnet11: { name: "Testnet 11", kind: "testnet", ticker: "TXCH", prefix: "txch", precision: 12 },
};

interface SageGlobals {
  __SAGE__?: unknown;
  __TAURI__?: unknown;
}

interface MockAssetRecord {
  coins: WalletSpendableAssetCoin[];
  balance: WalletGetAssetBalanceResult;
}

/** Mutable host state shared by the app / wallet / environment sub-clients. */
interface MockSageState {
  options: MockSageBridgeOptions;
  appId: string;
  appName: string;
  granted: Set<string>;
  grantable: Set<string>;
  approvals: MockSageApprovals;
  key: KeyInfo | null;
  receiveAddress: string | null;
  networkId: string;
  theme: EnvironmentThemeView;
  assets: Map<string, MockAssetRecord>;
  transactions: TransactionRecord[];
  publicKeys: string[];
  derivations: DerivationRecord[];
  calls: MockSageCall[];
  capabilityHandlers: Set<(event: GrantedCapabilitiesChangeEvent) => void>;
  themeHandlers: Set<(event: EnvironmentThemeChangedEvent) => void>;
  beforeStopHandlers: Set<(event: BeforeStopEvent) => void | Promise<void>>;
  coinCounter: number;
  record(method: string, params: unknown): void;
  require(capability: UserBridgeCapability, method: string): void;
  approve<T>(approval: MockSageApprovalMethod, method: string, value: () => T): Promise<T>;
  grantedList(): UserBridgeCapability[];
  emitCapabilityChange(added: string[], removed: string[]): void;
  lookupAsset(
    type: string | null | undefined,
    assetId: string | null | undefined
  ): MockAssetRecord | undefined;
}

function assetKey(type: string | null | undefined, assetId: string | null | undefined): string {
  const kind = type ?? "xch";
  return kind === "xch" ? "xch" : `${kind}:${(assetId ?? "").toLowerCase()}`;
}

function sumAmounts(coins: readonly WalletSpendableAssetCoin[]): string {
  return coins.reduce((total, coin) => total + BigInt(coin.coin.amount), BigInt(0)).toString();
}

function buildAssets(list: readonly MockSageAsset[]): Map<string, MockAssetRecord> {
  const assets = new Map<string, MockAssetRecord>();
  for (const asset of list) {
    const coins = asset.coins ?? [];
    const spendable = coins.filter((coin) => !coin.locked);
    assets.set(assetKey(asset.type, asset.assetId), {
      coins,
      balance: {
        confirmed: asset.balance?.confirmed ?? sumAmounts(coins),
        spendable: asset.balance?.spendable ?? sumAmounts(spendable),
        spendableCoinCount: asset.balance?.spendableCoinCount ?? spendable.length,
      },
    });
  }
  return assets;
}

function createState(options: MockSageBridgeOptions): MockSageState {
  const approvalTimeoutMs =
    options.approvalTimeoutMs === undefined ? 25 : options.approvalTimeoutMs;
  const rejectionMessage = options.rejectionMessage ?? "User rejected the request";
  const receiveAddress =
    options.receiveAddress === undefined ? MOCK_SAGE_RECEIVE_ADDRESS : options.receiveAddress;

  const state: MockSageState = {
    options,
    appId: options.appId ?? "pengui",
    appName: options.appName ?? "Pengui",
    granted: new Set<string>(options.capabilities ?? MOCK_SAGE_DEFAULT_CAPABILITIES),
    grantable: new Set<string>(options.grantable ?? MOCK_SAGE_ALL_CAPABILITIES),
    approvals: { ...options.approvals },
    key: options.key === null ? null : { ...MOCK_SAGE_KEY, ...(options.key ?? {}) },
    receiveAddress,
    networkId: options.networkId ?? "mainnet",
    theme: { ...DEFAULT_THEME, ...(options.theme ?? {}) },
    assets: buildAssets(options.assets ?? [{ coins: [MOCK_SAGE_XCH_COIN] }]),
    transactions: [...(options.transactions ?? [])],
    publicKeys: options.publicKeys ?? [MOCK_SAGE_KEY.public_key],
    derivations: options.derivations ?? [
      {
        index: 0,
        public_key: MOCK_SAGE_KEY.public_key,
        address: receiveAddress ?? MOCK_SAGE_RECEIVE_ADDRESS,
      },
    ],
    calls: [],
    capabilityHandlers: new Set(),
    themeHandlers: new Set(),
    beforeStopHandlers: new Set(),
    coinCounter: 0,

    record(method, params) {
      state.calls.push({ method, params });
    },
    require(capability, method) {
      if (!state.granted.has(capability)) {
        throw new Error(`Capability ${capability} is not granted (${method})`);
      }
    },
    approve(approval, method, value) {
      const outcome = state.approvals[approval] ?? "accept";
      if (outcome === "accept") return Promise.resolve(value());
      if (outcome === "reject") return Promise.reject(new Error(rejectionMessage));
      if (approvalTimeoutMs === null) return new Promise(() => {});
      return new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`timeout for ${method}`)), approvalTimeoutMs)
      );
    },
    grantedList() {
      return Array.from(state.granted) as UserBridgeCapability[];
    },
    emitCapabilityChange(added, removed) {
      const event: GrantedCapabilitiesChangeEvent = {
        added: added as UserBridgeCapability[],
        removed: removed as UserBridgeCapability[],
        full: state.grantedList(),
      };
      state.capabilityHandlers.forEach((handler) => handler(event));
    },
    lookupAsset(type, assetId) {
      return state.assets.get(assetKey(type, assetId));
    },
  };
  return state;
}

function createAppClient(state: MockSageState, initialAppInfo: AppGetInfoResult): SageAppClient {
  return {
    bridgePing: async () => {
      state.record("app.bridgePing", undefined);
      return { ok: true, appId: state.appId, appName: state.appName };
    },
    bridgeSend: async (input) => {
      state.record("app.bridgeSend", input);
      return { ok: true };
    },
    getInfo: async () => {
      state.record("app.getInfo", undefined);
      return { ...initialAppInfo, capabilities: state.grantedList() };
    },
    getCapabilities: async () => {
      state.record("app.getCapabilities", undefined);
      return state.grantedList();
    },
    requestCapabilityGrant: (input) => {
      state.record("app.requestCapabilityGrant", input);
      return state.approve("capabilityGrant", "app.requestCapabilityGrant", () => {
        const alreadyGranted = state.granted.has(input.capability);
        const canGrant = alreadyGranted || state.grantable.has(input.capability);
        if (canGrant && !alreadyGranted) {
          state.granted.add(input.capability);
          state.emitCapabilityChange([input.capability], []);
        }
        return {
          granted: canGrant,
          alreadyGranted,
          capability: input.capability,
          fullGrantedCapabilities: state.grantedList(),
        };
      });
    },
    requestNetworkWhitelistGrant: async (input) => {
      state.record("app.requestNetworkWhitelistGrant", input);
      return {
        granted: true,
        entry: input.entry,
        networkId: input.networkId ?? null,
        fullGrantedNetworkWhitelist: [input.entry],
      };
    },
    onGrantedCapabilitiesChange: (handler) => {
      state.capabilityHandlers.add(handler);
      return () => state.capabilityHandlers.delete(handler);
    },
    onGrantedNetworkWhitelistChange: () => () => {},
    lifecycle: {
      onBeforeStop: (handler) => {
        state.beforeStopHandlers.add(handler);
        return () => state.beforeStopHandlers.delete(handler);
      },
    },
  };
}

function createWalletQueryClient(
  state: MockSageState
): Pick<
  SageWalletClient,
  | "getKey"
  | "getSecretKey"
  | "getSyncStatus"
  | "getVersion"
  | "getAssetBalance"
  | "getAssetCoins"
  | "filterUnlockedCoins"
  | "getPublicKeys"
  | "getDerivations"
  | "getSpendableCoinCount"
  | "getCoinsByIds"
  | "getCoins"
  | "getPendingTransactions"
  | "getTransaction"
  | "getTransactions"
  | "getXchUsdPrice"
  | "checkAddress"
> {
  return {
    getKey: async (input) => {
      state.record("wallet.getKey", input);
      state.require("wallet.get_key", "wallet.getKey");
      const { key } = state;
      if (input.fingerprint != null && key && input.fingerprint !== key.fingerprint) {
        return { key: null };
      }
      return { key };
    },
    getSecretKey: async (input) => {
      state.record("wallet.getSecretKey", input);
      state.require("wallet.get_secret_key", "wallet.getSecretKey");
      return { secrets: null };
    },
    getSyncStatus: async () => {
      state.record("wallet.getSyncStatus", undefined);
      state.require("wallet.get_sync_status", "wallet.getSyncStatus");
      const xch = state.lookupAsset(null, null);
      const status: GetSyncStatusResponse = {
        selectable_balance: xch?.balance.spendable ?? "0",
        unit: { ticker: NETWORK_PRESETS[state.networkId]?.ticker ?? "XCH", precision: 12 },
        synced_coins: xch?.coins.length ?? 0,
        total_coins: xch?.coins.length ?? 0,
        receive_address: state.receiveAddress ?? "",
        burn_address: "xch1burn",
        unhardened_derivation_index: state.derivations.length,
        hardened_derivation_index: 0,
        checked_files: 0,
        total_files: 0,
        database_size: 0,
      };
      return status;
    },
    getVersion: async () => {
      state.record("wallet.getVersion", undefined);
      return { version: "0.13.0-mock" };
    },
    getAssetBalance: async (input) => {
      state.record("wallet.getAssetBalance", input);
      state.require("wallet.get_asset_balance", "wallet.getAssetBalance");
      return (
        state.lookupAsset(input.type, input.assetId)?.balance ?? {
          confirmed: "0",
          spendable: "0",
          spendableCoinCount: 0,
        }
      );
    },
    getAssetCoins: async (input) => {
      state.record("wallet.getAssetCoins", input);
      state.require("wallet.get_asset_coins", "wallet.getAssetCoins");
      const coins = state.lookupAsset(input.type, input.assetId)?.coins ?? [];
      const visible = input.includedLocked ? coins : coins.filter((coin) => !coin.locked);
      const offset = input.offset ?? 0;
      const limit = input.limit ?? visible.length;
      return visible.slice(offset, offset + limit);
    },
    filterUnlockedCoins: async (input) => {
      state.record("wallet.filterUnlockedCoins", input);
      const locked = new Set(
        Array.from(state.assets.values())
          .flatMap((asset) => asset.coins)
          .filter((coin) => coin.locked)
          .map((coin) => coin.coinName)
      );
      return input.coinNames.filter((name) => !locked.has(name));
    },
    getPublicKeys: async (input) => {
      state.record("wallet.getPublicKeys", input);
      state.require("wallet.get_public_keys", "wallet.getPublicKeys");
      const offset = input?.offset ?? 0;
      const limit = input?.limit ?? state.publicKeys.length;
      return state.publicKeys.slice(offset, offset + limit);
    },
    getDerivations: async (input) => {
      state.record("wallet.getDerivations", input);
      state.require("wallet.get_derivations", "wallet.getDerivations");
      const list = input.hardened ? [] : state.derivations;
      const offset = input.offset ?? 0;
      const limit = input.limit ?? list.length;
      return { derivations: list.slice(offset, offset + limit), total: list.length };
    },
    getSpendableCoinCount: async (input) => {
      state.record("wallet.getSpendableCoinCount", input);
      return { count: state.lookupAsset(null, input.asset_id)?.balance.spendableCoinCount ?? 0 };
    },
    getCoinsByIds: async (input) => {
      state.record("wallet.getCoinsByIds", input);
      return { coins: [] };
    },
    getCoins: async (input) => {
      state.record("wallet.getCoins", input);
      return { coins: [], total: 0 };
    },
    getPendingTransactions: async () => {
      state.record("wallet.getPendingTransactions", undefined);
      return { transactions: [] };
    },
    getTransaction: async (input) => {
      state.record("wallet.getTransaction", input);
      return {
        transaction: state.transactions.find((record) => record.height === input.height) ?? null,
      };
    },
    getTransactions: async (input) => {
      state.record("wallet.getTransactions", input);
      state.require("wallet.get_transactions", "wallet.getTransactions");
      const sorted = [...state.transactions].sort((a, b) =>
        input.ascending ? a.height - b.height : b.height - a.height
      );
      const offset = input.offset ?? 0;
      const limit = input.limit ?? sorted.length;
      return {
        transactions: sorted.slice(offset, offset + limit),
        total: state.transactions.length,
      };
    },
    getXchUsdPrice: async () => {
      state.record("wallet.getXchUsdPrice", undefined);
      return { usd: state.options.xchUsdPrice ?? 20 };
    },
    checkAddress: async (input) => {
      state.record("wallet.checkAddress", input);
      return { valid: /^(xch|txch)1[a-z0-9]{20,}$/.test(input.address) };
    },
  };
}

function createWalletActionClient(
  state: MockSageState
): Pick<SageWalletClient, "sendXch" | "signCoinSpends" | "signMessage" | "sendTransaction"> {
  return {
    sendXch: (input) => {
      state.record("wallet.sendXch", input);
      state.require("wallet.send_xch", "wallet.sendXch");
      return state.approve("sendXch", "wallet.sendXch", () => {
        state.coinCounter += 1;
        const coinId = `0x${state.coinCounter.toString(16).padStart(64, "0")}`;
        const outputId = `0x${(state.coinCounter + 0x1000).toString(16).padStart(64, "0")}`;
        return {
          summary: {
            fee: input.fee,
            inputs: [
              {
                coin_id: coinId,
                amount: input.amount,
                address: state.receiveAddress ?? "",
                asset: null,
                outputs: [
                  {
                    coin_id: outputId,
                    amount: input.amount,
                    address: input.address,
                    receiving: false,
                    burning: false,
                  },
                ],
              },
            ],
          },
          coin_spends: [],
        };
      });
    },
    signCoinSpends: (input) => {
      state.record("wallet.signCoinSpends", input);
      state.require("wallet.sign_coin_spends", "wallet.signCoinSpends");
      return state.approve(
        "signCoinSpends",
        "wallet.signCoinSpends",
        () => state.options.aggregatedSignature ?? `0x${"c0".repeat(96)}`
      );
    },
    signMessage: (input) => {
      state.record("wallet.signMessage", input);
      state.require("wallet.sign_message", "wallet.signMessage");
      return state.approve(
        "signMessage",
        "wallet.signMessage",
        () => state.options.messageSignature ?? `sig:${input.publicKey}:${input.message}`
      );
    },
    sendTransaction: (input) => {
      state.record("wallet.sendTransaction", input);
      state.require("wallet.send_transaction", "wallet.sendTransaction");
      return state.approve("sendTransaction", "wallet.sendTransaction", () => ({
        status: state.options.sendTransactionStatus ?? 1,
        error: null,
      }));
    },
  };
}

function createEnvironmentClient(state: MockSageState): SageEnvironmentClient {
  return {
    theme: {
      getCurrent: async () => {
        state.record("environment.theme.getCurrent", undefined);
        return { theme: state.theme };
      },
      onChanged: (handler) => {
        state.themeHandlers.add(handler);
        return () => state.themeHandlers.delete(handler);
      },
      mountCssVars: async () => {
        state.record("environment.theme.mountCssVars", undefined);
        return () => {};
      },
    },
    getNetwork: async () => {
      state.record("environment.getNetwork", undefined);
      state.require("environment.get_network", "environment.getNetwork");
      const preset = NETWORK_PRESETS[state.networkId] ?? {
        name: state.networkId,
        kind: "unknown" as const,
        ticker: "XCH",
        prefix: "xch",
        precision: 12,
      };
      return { networkId: state.networkId, ...preset };
    },
  };
}

function dispatchSelectedWalletChanged(fingerprint: number | null): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("sage:event:wallet.selectedWallet.changed", {
      detail: { type: "wallet.selectedWallet.changed", payload: { fingerprint } },
    })
  );
}

/**
 * Build a `SageClient`-shaped fake without installing it anywhere. Use this
 * when injecting the client through `createSageBridgeProvider({ getClient })`;
 * use {@link installMockSageBridge} to exercise the real SDK entry point.
 */
export function createMockSageClient(options: MockSageBridgeOptions = {}): MockSageClientHandle {
  const state = createState(options);

  const initialAppInfo: AppGetInfoResult = {
    id: state.appId,
    name: state.appName,
    version: "0.0.0-mock",
    requestedPermissions: {
      network: { whitelist: { required: [], optional: [] }, whitelistByNetwork: {} },
      capabilities: { required: [...MOCK_SAGE_DEFAULT_CAPABILITIES], optional: [] },
    },
    capabilities: state.grantedList(),
    network: [],
  };

  const client: SageClient = {
    initialAppInfo,
    app: createAppClient(state, initialAppInfo),
    wallet: { ...createWalletQueryClient(state), ...createWalletActionClient(state) },
    environment: createEnvironmentClient(state),
  };

  return {
    client,
    calls: state.calls,
    callsTo: (method) =>
      state.calls.filter((call) => call.method === method).map((call) => call.params),
    grantedCapabilities: () => Array.from(state.granted),
    grantCapabilities: (...capabilities) => {
      const added = capabilities.filter((capability) => !state.granted.has(capability));
      added.forEach((capability) => state.granted.add(capability));
      if (added.length) state.emitCapabilityChange(added, []);
    },
    revokeCapabilities: (...capabilities) => {
      const removed = capabilities.filter((capability) => state.granted.has(capability));
      removed.forEach((capability) => state.granted.delete(capability));
      if (removed.length) state.emitCapabilityChange([], removed);
    },
    setKey: (next) => {
      state.key = next === null ? null : { ...MOCK_SAGE_KEY, ...next };
    },
    selectWallet: (next) => {
      state.key = next === null ? null : { ...MOCK_SAGE_KEY, ...next };
      dispatchSelectedWalletChanged(state.key?.fingerprint ?? null);
    },
    setReceiveAddress: (address) => {
      state.receiveAddress = address;
    },
    setNetworkId: (next) => {
      state.networkId = next;
    },
    setTheme: (next) => {
      state.theme = { ...state.theme, ...next };
      const event: EnvironmentThemeChangedEvent = { theme: state.theme };
      state.themeHandlers.forEach((handler) => handler(event));
    },
    setApproval: (method, outcome) => {
      state.approvals[method] = outcome;
    },
    emitBeforeStop: async (requestId = "mock-stop") => {
      await Promise.all(
        Array.from(state.beforeStopHandlers).map((handler) => handler({ requestId }))
      );
    },
    beforeStopHandlerCount: () => state.beforeStopHandlers.size,
  };
}

/**
 * Install a mock Sage host: `window.__SAGE__` (what `sage-app-sdk`'s
 * `getSageClient()` returns) plus `globalThis.__TAURI__` / `window.__TAURI__`
 * (what `detectWalletRuntime()` probes). Call `uninstall()` in `afterEach`.
 */
export function installMockSageBridge(options: MockSageBridgeOptions = {}): MockSageBridgeHandle {
  const handle = createMockSageClient(options);
  const tauriStub = {
    core: {
      invoke: async (command: string) => {
        throw new Error(`Mock Sage host: raw Tauri invoke of "${command}" is not allowed`);
      },
    },
  };

  const globals = globalThis as SageGlobals;
  globals.__TAURI__ = tauriStub;
  if (typeof window !== "undefined") {
    const windowGlobals = window as unknown as SageGlobals;
    windowGlobals.__SAGE__ = handle.client;
    windowGlobals.__TAURI__ = tauriStub;
  } else {
    globals.__SAGE__ = handle.client;
  }

  return {
    ...handle,
    uninstall: () => {
      delete globals.__SAGE__;
      delete globals.__TAURI__;
      if (typeof window !== "undefined") {
        const windowGlobals = window as unknown as SageGlobals;
        delete windowGlobals.__SAGE__;
        delete windowGlobals.__TAURI__;
      }
    },
  };
}
