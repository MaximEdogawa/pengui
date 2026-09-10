"use client";

import { useWalletState } from "@/shared/providers/WalletRuntimeProvider";

/**
 * Hook to get the fingerprint of the connected wallet key.
 *
 * Adapter-agnostic: the WalletConnect adapter resolves it from the session
 * accounts / redux fingerprint map, the Sage adapter from `wallet.getKey()`.
 */
export function useWalletFingerprint(): string | null {
  const { fingerprint } = useWalletState();
  return fingerprint == null ? null : String(fingerprint);
}
