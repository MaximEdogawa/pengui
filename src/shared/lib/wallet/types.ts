/**
 * Provider-agnostic wallet layer.
 *
 * Every wallet operation Pengui performs goes through the {@link WalletProvider}
 * interface. Today the only implementation is the WalletConnect adapter
 * (`./walletconnect`); the Sage in-app bridge adapter is added on top of the same
 * interface (see pengui-wiki/architecture/sage-in-app-integration.md).
 *
 * The interface is intentionally transport-neutral: no WalletConnect RPC names,
 * no SignClient, no redux. Adapters map these calls onto their own transport.
 */

import type {
  AssetType,
  CancelOfferRequest,
  CancelOfferResponse,
  CoinSpend,
  OfferRequest,
  OfferResponse,
  SignMessageRequest,
  SignMessageResponse,
  TakeOfferRequest,
  TakeOfferResponse,
  TransactionRequest,
  TransactionResponse,
} from "@/shared/lib/walletConnect/types/command.types";
import type {
  AssetBalance,
  AssetCoins,
} from "@/shared/lib/walletConnect/types/walletConnect.types";

export type {
  AssetType,
  CancelOfferRequest,
  CancelOfferResponse,
  CoinSpend,
  OfferRequest,
  OfferResponse,
  SignMessageRequest,
  SignMessageResponse,
  TakeOfferRequest,
  TakeOfferResponse,
  TransactionRequest,
  TransactionResponse,
  AssetBalance,
  AssetCoins,
};

/** Which wallet transport the app is talking to. */
export type WalletRuntimeKind = "walletconnect" | "sage-bridge";

/** Chia network as Pengui names it (Sage's `testnet11` maps to `testnet`). */
export type WalletNetwork = "mainnet" | "testnet";

/**
 * Which operations the active transport can perform.
 *
 * WalletConnect supports everything. The Sage bridge has no offer RPCs, so
 * `createOffer` / `takeOffer` / `cancelOffer` depend on the client-side offer
 * builder and on the granted `wallet.sign_coin_spends` capability, and
 * `switchNetwork` is false because Sage owns the active network.
 */
export interface WalletCapabilities {
  createOffer: boolean;
  takeOffer: boolean;
  cancelOffer: boolean;
  sendXch: boolean;
  signCoinSpends: boolean;
  signMessage: boolean;
  switchNetwork: boolean;
}

/** Connection state shared by every adapter. */
export interface WalletState {
  kind: WalletRuntimeKind;
  /** A wallet is paired / selected. */
  isConnected: boolean;
  /**
   * The transport is ready to serve requests. WalletConnect needs its
   * SignClient initialised on top of a live session; the Sage bridge needs the
   * SDK bridge up and the required capabilities granted. Gate data fetching on
   * this, not on {@link WalletState.isConnected}.
   */
  isReady: boolean;
  fingerprint: number | null;
  address: string | null;
  network: WalletNetwork;
  /** Human readable wallet name, when the transport knows one. */
  walletName: string | null;
  capabilities: WalletCapabilities;
}

/** Listener signature for {@link WalletProvider.subscribe}. */
export type WalletStateListener = (state: WalletState) => void;

/**
 * Machine-readable error discriminator, so callers do not have to match on
 * free-text messages. Adapters may return additional codes.
 */
export type WalletErrorCode =
  | "not-connected"
  | "session-missing"
  | "unsupported"
  | "invalid-request"
  | "request-failed";

/**
 * Uniform result envelope. Mirrors what
 * `shared/lib/walletConnect/repositories/walletQueries.repository` already
 * returns so the WalletConnect adapter stays a pass-through.
 */
export interface WalletResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: WalletErrorCode;
}

/** A signed spend bundle, the unit both adapters can broadcast. */
export interface SpendBundle {
  coin_spends: CoinSpend[];
  aggregated_signature: string;
}

export interface SignCoinSpendsRequest {
  walletId: number;
  coinSpends: CoinSpend[];
  /**
   * Sign without requiring the bundle to be complete (used when building
   * offers). WalletConnect ignores this flag.
   */
  partialSign?: boolean;
}

export interface SendSpendBundleRequest {
  spendBundle: SpendBundle;
}

export interface SendSpendBundleResponse {
  status: number | string;
  error?: string | null;
}

export interface GetPublicKeysRequest {
  limit?: number;
  offset?: number;
  hardened?: boolean;
}

export interface GetTransactionsRequest {
  offset?: number;
  limit?: number;
  ascending?: boolean;
  findValue?: string;
}

export interface WalletTransactionRecord {
  transactionId: string;
  height?: number | null;
  timestamp?: number | null;
  [key: string]: unknown;
}

export interface WalletPingOptions {
  timeoutMs?: number;
}

/** Options accepted by {@link WalletProvider.connect}. */
export interface WalletConnectOptions {
  /**
   * Called with a pairing URI when the transport needs the user to scan or copy
   * one. The Sage bridge never calls it.
   */
  onPairingUri?: (uri: string) => void;
  signal?: AbortSignal;
}

export interface WalletDisconnectOptions {
  /** Clear redux-persist keys as well (loading fallback escape hatch). */
  clearPersist?: boolean;
}

/**
 * The seam between Pengui features and a wallet transport.
 *
 * Implementations must be safe to call at any time: when the wallet is not
 * connected they return `{ success: false, code: "not-connected" }` rather than
 * throwing, and unsupported operations return `{ success: false, code:
 * "unsupported" }` so the UI can disable them from {@link WalletState.capabilities}.
 */
export interface WalletProvider {
  readonly kind: WalletRuntimeKind;

  // ── state ────────────────────────────────────────────────
  /** Latest published state. React consumers should prefer `useWalletState()`. */
  getState(): WalletState;
  /** Subscribe to state changes. Returns an unsubscribe function. */
  subscribe(listener: WalletStateListener): () => void;

  // ── lifecycle ────────────────────────────────────────────
  /** Prepare the transport (idempotent). */
  initialize(): Promise<void>;
  connect(options?: WalletConnectOptions): Promise<WalletResult<WalletState>>;
  disconnect(options?: WalletDisconnectOptions): Promise<WalletResult<void>>;
  /** Liveness probe. `code: "session-missing"` means the session is gone. */
  ping(options?: WalletPingOptions): Promise<WalletResult<boolean>>;

  // ── queries ──────────────────────────────────────────────
  getNetwork(): Promise<WalletResult<WalletNetwork>>;
  getAddress(): Promise<WalletResult<{ address: string }>>;
  getAssetBalance(
    type?: AssetType | null,
    assetId?: string | null
  ): Promise<WalletResult<AssetBalance | null>>;
  getAssetCoins(
    type?: AssetType | null,
    assetId?: string | null
  ): Promise<WalletResult<AssetCoins | null>>;
  getPublicKeys(request?: GetPublicKeysRequest): Promise<WalletResult<string[]>>;
  getTransactions?(
    request?: GetTransactionsRequest
  ): Promise<WalletResult<WalletTransactionRecord[]>>;

  // ── actions ──────────────────────────────────────────────
  /** Send XCH (or a CAT when `assetId` is set) to an address. */
  sendXch(request: TransactionRequest): Promise<WalletResult<TransactionResponse>>;
  /**
   * Sign coin spends and return a complete spend bundle. WalletConnect returns
   * the signed spends directly; the Sage adapter assembles the bundle from the
   * aggregated signature `wallet.signCoinSpends` returns.
   */
  signCoinSpends(request: SignCoinSpendsRequest): Promise<WalletResult<SpendBundle>>;
  /** Broadcast an already signed spend bundle. */
  sendTransaction(request: SendSpendBundleRequest): Promise<WalletResult<SendSpendBundleResponse>>;
  signMessage(request: SignMessageRequest): Promise<WalletResult<SignMessageResponse>>;
  createOffer(request: OfferRequest): Promise<WalletResult<OfferResponse>>;
  takeOffer(request: TakeOfferRequest): Promise<WalletResult<TakeOfferResponse>>;
  cancelOffer(request: CancelOfferRequest): Promise<WalletResult<CancelOfferResponse>>;
}
