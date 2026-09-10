import type { SessionTypes } from "@walletconnect/types";
import type { WalletConnectSession } from "@/shared/lib/walletConnect/types/walletConnect.types";

export interface BuildWalletConnectSessionInput {
  /** Session from `useWalletConnectionState()`, preferred when present. */
  walletConnectSession: SessionTypes.Struct | null | undefined;
  /** Session from the redux store, used as a fallback. */
  selectedSession: SessionTypes.Struct | null | undefined;
  /** Redux topic → fingerprint map. */
  fingerprintMap: Record<string, number> | undefined;
  isConnected: boolean;
  /** Chain id derived from the app's current network preference. */
  defaultChainId: string;
}

/**
 * Build the WalletConnect session descriptor used by every RPC call.
 *
 * Extracted verbatim from the former `features/wallet/hooks/useWalletSession`
 * so the chain-id resolution order and the fingerprint parsing stay identical.
 */
export function buildWalletConnectSession({
  walletConnectSession,
  selectedSession,
  fingerprintMap,
  isConnected,
  defaultChainId,
}: BuildWalletConnectSessionInput): WalletConnectSession {
  // Use walletConnectSession from the hook if available, otherwise fall back to selectedSession
  const sessionData = walletConnectSession || selectedSession;

  if (!sessionData || !isConnected) {
    return {
      session: null,
      chainId: defaultChainId,
      fingerprint: 0,
      topic: "",
      isConnected: false,
    };
  }

  const chains = sessionData.namespaces.chia?.chains;
  const accounts = sessionData.namespaces.chia?.accounts;

  // Get the chainId that the wallet session actually supports
  // This is critical: we must use a chainId that the wallet supports, otherwise WalletConnect will reject the request
  const sessionChains = chains || [];
  let walletChainId: string;

  // Priority 1: If session has chains defined, use the first one (most reliable)
  // This ensures we always use a chainId the wallet actually supports
  if (sessionChains.length > 0) {
    walletChainId = sessionChains[0];

    // If app network matches session chain, use it; otherwise use session's chainId
    // Note: We don't log here to avoid potential render loops - the mismatch is handled by validateChainId
    if (sessionChains.includes(defaultChainId)) {
      walletChainId = defaultChainId;
    }
    // Otherwise use sessionChains[0] which is already set above
  } else if (accounts && accounts.length > 0) {
    // Priority 2: Extract chainId from accounts if chains array is empty
    // Account format can be: "chia:chainId:fingerprint" or "chia:mainnet:fingerprint"
    const accountParts = accounts[0].split(":");
    if (accountParts.length >= 4 && accountParts[1] === "chia") {
      const networkPart = accountParts[2];
      walletChainId = `chia:${networkPart}`;
    } else if (accountParts.length >= 3) {
      if (accountParts[1] === "chia") {
        walletChainId = `chia:${accountParts[2]}`;
      } else {
        walletChainId = `chia:${accountParts[1]}`;
      }
    } else if (accountParts.length >= 2) {
      walletChainId = `chia:${accountParts[1]}`;
    } else {
      walletChainId = defaultChainId;
    }
  } else {
    // Priority 3: Fallback to app's network chainId
    walletChainId = defaultChainId;
  }

  const chainId = walletChainId;
  const fingerprint =
    accounts && accounts.length > 0
      ? (() => {
          // Account format can vary, try to extract fingerprint
          // Format: "chia:chainId:fingerprint" or "chia:mainnet:fingerprint"
          const accountParts = accounts[0].split(":");
          if (accountParts.length >= 4) {
            // Format: chia:chia:mainnet:fingerprint
            const parsed = parseInt(accountParts[3] || "0", 10);
            return Number.isNaN(parsed) ? 0 : parsed;
          } else if (accountParts.length >= 3) {
            // Format: chia:mainnet:fingerprint
            const parsed = parseInt(accountParts[2] || "0", 10);
            return Number.isNaN(parsed) ? 0 : parsed;
          }
          return 0;
        })()
      : fingerprintMap?.[sessionData.topic] || 0;

  return {
    session: sessionData,
    chainId,
    fingerprint,
    topic: sessionData.topic,
    isConnected: true,
  };
}

/**
 * Fingerprint as the wallet UI shows it, mirroring the former
 * `useWalletFingerprint` resolution order (redux map first, then the account
 * string).
 */
export function resolveWalletConnectFingerprint(
  selectedSession: SessionTypes.Struct | null | undefined,
  fingerprintMap: Record<string, number> | undefined
): string | null {
  if (selectedSession?.topic && fingerprintMap?.[selectedSession.topic]) {
    return String(fingerprintMap[selectedSession.topic]);
  }

  if (selectedSession?.namespaces?.chia?.accounts?.[0]) {
    const account = selectedSession.namespaces.chia.accounts[0];
    // Account format: "chia:chainId:fingerprint"
    const parts = account.split(":");
    if (parts.length >= 3) {
      return parts[2];
    }
  }

  return null;
}
