import {
  WalletConnect,
  store,
  connectSession as connectSessionAction,
  setConnectedWallet,
} from "@maximedogawa/chia-wallet-connect-react";
import {
  WALLET_CONNECT_STORAGE_KEY,
  getWalletConnectAppConfig,
} from "./constants/wallet-connect";

export interface DisconnectWalletOptions {
  /** Clear all redux-persist keys from localStorage (use on loading fallback before redirect). */
  clearPersist?: boolean;
  /** Redirect to /login after disconnecting. */
  redirectToLogin?: boolean;
}

/**
 * Disconnect wallet: end WalletConnect sessions, clear Redux state and localStorage.
 * Reusable from SafeConnectButton (disconnect only) and PersistGateLoadingFallback (disconnect + clear persist + redirect).
 */
export async function disconnectWallet(
  options: DisconnectWalletOptions = {}
): Promise<void> {
  const { clearPersist = false, redirectToLogin = false } = options;

  try {
    const { penguiIcon, metadata } = getWalletConnectAppConfig();
    const wc = new WalletConnect(penguiIcon, metadata);

    const state = store.getState();
    const sessions = state.walletConnect?.sessions ?? [];
    for (const s of sessions) {
      try {
        await wc.disconnectSession(s.topic);
      } catch {
        /* ignore */
      }
    }

    store.dispatch(setConnectedWallet(null));
    store.dispatch(connectSessionAction(null));

    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(WALLET_CONNECT_STORAGE_KEY);
        if (clearPersist) {
          const keysToRemove = Array.from(
            { length: window.localStorage.length },
            (_, i) => window.localStorage.key(i)
          ).filter(
            (key): key is string => key !== null && key.startsWith("persist:")
          );
          keysToRemove.forEach((key) => localStorage.removeItem(key));
        }
      } catch {
        /* ignore */
      }
    }

    if (redirectToLogin && typeof window !== "undefined") {
      window.location.href = "/login";
    }
  } catch {
    throw new Error("Failed to disconnect");
  }
}
