import {
  WalletConnect,
  store,
  setPairingUri,
  connectSession as connectSessionAction,
  setConnectedWallet,
  setSelectedFingerprint,
} from "@maximedogawa/chia-wallet-connect-react";
import type { SessionTypes } from "@walletconnect/types";
import {
  getStoredNetwork,
  hasNetworkPreference,
  setStoredNetwork,
} from "@/shared/lib/utils/networkStorage";
import { getRequiredNamespaces } from "@/shared/lib/walletConnect/constants/wallet-connect";

/** App metadata advertised to the wallet during pairing. */
export function getWalletConnectAppMetadata() {
  const penguiIcon =
    typeof window !== "undefined"
      ? `${window.location.origin}/pengui-logo.png`
      : "/pengui-logo.png";
  return {
    penguiIcon,
    metadata: {
      name: "Pengui",
      description: "Pengui - Decentralized lending platform on Chia Network",
      url: typeof window !== "undefined" ? window.location.origin : "https://pengui.space",
      icons: [penguiIcon],
    },
  };
}

export type WalletConnectPairingOutcome =
  | { status: "connected"; session: SessionTypes.Struct }
  /** The user declined in the wallet. */
  | { status: "rejected" }
  /** The caller went away (unmounted) before the flow finished. */
  | { status: "cancelled" }
  /** The SignClient could not be created. */
  | { status: "unavailable" }
  | { status: "failed"; error: string };

export interface WalletConnectPairingHooks {
  /** Return false to abandon the flow (component unmounted). */
  isActive?: () => boolean;
  /** Called with the pairing URI to render, and with null once it is consumed. */
  onPairingUri?: (uri: string | null) => void;
  /** Called once the URI is available and the wallet approval is pending. */
  onPairingReady?: () => void;
}

/**
 * Run the WalletConnect pairing flow: create a SignClient, publish the pairing
 * URI, wait for the wallet to approve and store the resulting session.
 *
 * Extracted unchanged from `LoginConnectWallet` and `SafeConnectButton`, which
 * held two identical copies. Keeping it here means the login and header UI no
 * longer import the WalletConnect library directly, and the Sage adapter can
 * offer its own `connect()` behind the same `WalletProvider` seam.
 */
export async function connectWalletConnect(
  hooks: WalletConnectPairingHooks = {}
): Promise<WalletConnectPairingOutcome> {
  const isActive = hooks.isActive ?? (() => true);

  try {
    if (!hasNetworkPreference()) setStoredNetwork("mainnet");

    const { penguiIcon, metadata } = getWalletConnectAppMetadata();
    const wc = new WalletConnect(penguiIcon, metadata);
    const signClient = await wc.signClient();

    if (!signClient) return { status: "unavailable" };
    if (!isActive()) return { status: "cancelled" };

    const network = getStoredNetwork();
    const requiredNamespaces = getRequiredNamespaces(network);
    const { uri: pairingUri, approval } = await signClient.connect({
      optionalNamespaces: requiredNamespaces,
    });

    if (!isActive()) return { status: "cancelled" };

    if (pairingUri) {
      hooks.onPairingUri?.(pairingUri);
      store.dispatch(setPairingUri(pairingUri));
    }

    hooks.onPairingReady?.();

    if (!approval) return { status: "cancelled" };

    let session: SessionTypes.Struct;
    try {
      session = await approval();
    } catch {
      return { status: "rejected" };
    }

    if (!isActive()) return { status: "cancelled" };

    await storeWalletConnectSession(session, wc, hooks.onPairingUri);
    return { status: "connected", session };
  } catch (error) {
    return {
      status: "failed",
      error: error instanceof Error ? error.message : "Failed to initialise connection",
    };
  }
}

/**
 * Persist an approved session: clear the pairing URI, refresh the library's
 * session cache, remember the fingerprint and resolve the receive address.
 */
async function storeWalletConnectSession(
  session: SessionTypes.Struct,
  wc: InstanceType<typeof WalletConnect>,
  onPairingUri?: (uri: string | null) => void
): Promise<void> {
  store.dispatch(setPairingUri(null));
  onPairingUri?.(null);

  await wc.detectEvents();
  await wc.updateSessions();
  store.dispatch(connectSessionAction(session));

  const fingerprint = Number(session.namespaces.chia.accounts[0].split(":")[2]);
  store.dispatch(
    setSelectedFingerprint({ topic: session.topic, selectedFingerprint: fingerprint })
  );

  wc.topic = session.topic;
  wc.session = session;
  wc.selectedFingerprint = fingerprint;

  let address: string | null = null;
  try {
    address = await wc.verifyConnectionWithSageMethod();
    if (!address) address = await wc.getAddress();
  } catch {
    try {
      address = await wc.getAddress();
    } catch {
      /* continue */
    }
  }

  store.dispatch(setConnectedWallet({ wallet: "WalletConnect", address, name: "WalletConnect" }));
  // SignClient invalidation is handled once by NetworkProvider when
  // isConnected/session updates (avoids duplicate invalidate + relay loop).
}

/**
 * End every WalletConnect session and clear the connected-wallet state without
 * touching localStorage. Used by the header "Reconnect" action.
 */
export async function resetWalletConnectSessions(): Promise<void> {
  const { penguiIcon, metadata } = getWalletConnectAppMetadata();
  const wc = new WalletConnect(penguiIcon, metadata);

  const state = store.getState();
  const sessions = state.walletConnect?.sessions ?? [];
  for (const s of sessions) {
    try {
      await wc.disconnectSession(s.topic);
    } catch {
      /* ok */
    }
  }

  store.dispatch(setConnectedWallet(null));
  store.dispatch(connectSessionAction(null));
}
