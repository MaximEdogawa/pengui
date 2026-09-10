import type {
  AssetBalance,
  AssetCoins,
  CancelOfferResponse,
  OfferResponse,
  SendSpendBundleResponse,
  SignMessageResponse,
  SpendBundle,
  TakeOfferResponse,
  TransactionResponse,
  WalletNetwork,
  WalletProvider,
  WalletResult,
  WalletState,
  WalletStateListener,
} from "../types";
import { createWalletStateStore, DISCONNECTED_WALLET_STATE } from "../walletStateStore";

const NOT_IMPLEMENTED = "Sage bridge adapter is not implemented yet (TASK-001.02)";

export const INITIAL_SAGE_BRIDGE_STATE: WalletState = {
  ...DISCONNECTED_WALLET_STATE,
  kind: "sage-bridge",
};

function unsupported<T>(): WalletResult<T> {
  return { success: false, error: NOT_IMPLEMENTED, code: "unsupported" };
}

export interface SageBridgeWalletProvider extends WalletProvider {
  setState(next: WalletState): void;
}

/**
 * Placeholder Sage adapter.
 *
 * TASK-001.01 only creates the seam; TASK-001.02 replaces this body with the
 * real `sage-app-sdk` bridge (initSageRuntimeBridge, app.getCapabilities,
 * wallet.getKey / getSyncStatus / getAssetBalance / getAssetCoins / sendXch /
 * signCoinSpends / sendTransaction, environment.getNetwork). Every operation
 * reports `code: "unsupported"` so the UI degrades instead of crashing if the
 * runtime is forced on before then.
 */
export function createSageBridgeProvider(): SageBridgeWalletProvider {
  const store = createWalletStateStore(INITIAL_SAGE_BRIDGE_STATE);

  return {
    kind: "sage-bridge",

    getState: (): WalletState => store.getState(),
    subscribe: (listener: WalletStateListener) => store.subscribe(listener),
    setState: (next: WalletState) => store.setState(next),

    async initialize(): Promise<void> {
      throw new Error(NOT_IMPLEMENTED);
    },

    async connect(): Promise<WalletResult<WalletState>> {
      return unsupported<WalletState>();
    },
    async disconnect(): Promise<WalletResult<void>> {
      // There is no disconnect inside Sage: the wallet is the host.
      return { success: true };
    },
    async ping(): Promise<WalletResult<boolean>> {
      return unsupported<boolean>();
    },

    async getNetwork(): Promise<WalletResult<WalletNetwork>> {
      return unsupported<WalletNetwork>();
    },
    async getAddress(): Promise<WalletResult<{ address: string }>> {
      return unsupported<{ address: string }>();
    },
    async getAssetBalance(): Promise<WalletResult<AssetBalance | null>> {
      return unsupported<AssetBalance | null>();
    },
    async getAssetCoins(): Promise<WalletResult<AssetCoins | null>> {
      return unsupported<AssetCoins | null>();
    },
    async getPublicKeys(): Promise<WalletResult<string[]>> {
      return unsupported<string[]>();
    },

    async sendXch(): Promise<WalletResult<TransactionResponse>> {
      return unsupported<TransactionResponse>();
    },
    async signCoinSpends(): Promise<WalletResult<SpendBundle>> {
      return unsupported<SpendBundle>();
    },
    async sendTransaction(): Promise<WalletResult<SendSpendBundleResponse>> {
      return unsupported<SendSpendBundleResponse>();
    },
    async signMessage(): Promise<WalletResult<SignMessageResponse>> {
      return unsupported<SignMessageResponse>();
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
