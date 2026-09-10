"use client";

import { useAppSelector, useWalletConnectionState } from "@maximedogawa/chia-wallet-connect-react";
import type { SessionTypes } from "@walletconnect/types";

export interface WalletConnectSessionState {
  isConnected: boolean;
  address: string | null;
  walletName: string | null;
  connectedWallet: string | null;
  /** Session reported by the library hook. */
  walletConnectSession: SessionTypes.Struct | null;
  /** Session persisted in the redux store (fallback). */
  selectedSession: SessionTypes.Struct | null;
  /** Redux topic → fingerprint map. */
  fingerprintMap: Record<string, number> | undefined;
}

/**
 * The single place in the app that reads the WalletConnect redux store.
 *
 * Everything else goes through the WalletProvider / `useWalletState()`, so a
 * second transport can be dropped in without touching features or UI.
 */
export function useWalletConnectSessionState(): WalletConnectSessionState {
  const { isConnected, address, walletName, connectedWallet, walletConnectSession } =
    useWalletConnectionState();
  const selectedSession = useAppSelector((state) => state.walletConnect?.selectedSession);
  const fingerprintMap = useAppSelector((state) => state.walletConnect?.selectedFingerprint);

  return {
    isConnected,
    address,
    walletName,
    connectedWallet,
    walletConnectSession,
    selectedSession: selectedSession ?? null,
    fingerprintMap,
  };
}
