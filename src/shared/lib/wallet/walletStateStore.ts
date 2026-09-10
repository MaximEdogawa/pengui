import type { WalletState, WalletStateListener } from "./types";

/** Everything off: the state every adapter starts from. */
export const DISCONNECTED_WALLET_STATE: WalletState = {
  kind: "walletconnect",
  isConnected: false,
  isReady: false,
  fingerprint: null,
  address: null,
  network: "mainnet",
  walletName: null,
  capabilities: {
    createOffer: false,
    takeOffer: false,
    cancelOffer: false,
    sendXch: false,
    signCoinSpends: false,
    signMessage: false,
    switchNetwork: false,
  },
};

export interface WalletStateStore {
  getState(): WalletState;
  /** Replaces the snapshot and notifies listeners only when something changed. */
  setState(next: WalletState): void;
  subscribe(listener: WalletStateListener): () => void;
}

function shallowEqualCapabilities(a: WalletState, b: WalletState): boolean {
  const keys = Object.keys(a.capabilities) as Array<keyof WalletState["capabilities"]>;
  return keys.every((key) => a.capabilities[key] === b.capabilities[key]);
}

function isSameWalletState(a: WalletState, b: WalletState): boolean {
  return (
    a.kind === b.kind &&
    a.isConnected === b.isConnected &&
    a.isReady === b.isReady &&
    a.fingerprint === b.fingerprint &&
    a.address === b.address &&
    a.network === b.network &&
    a.walletName === b.walletName &&
    shallowEqualCapabilities(a, b)
  );
}

/**
 * Tiny observable snapshot holder shared by the wallet adapters.
 *
 * It keeps the snapshot identity stable when nothing changed, so
 * `useSyncExternalStore` consumers do not re-render in a loop — see
 * pengui-wiki/development/infinite-loop-guardrails.md.
 */
export function createWalletStateStore(initialState: WalletState): WalletStateStore {
  let state = initialState;
  const listeners = new Set<WalletStateListener>();

  return {
    getState: () => state,
    setState(next: WalletState) {
      if (isSameWalletState(state, next)) return;
      state = next;
      listeners.forEach((listener) => listener(state));
    },
    subscribe(listener: WalletStateListener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
