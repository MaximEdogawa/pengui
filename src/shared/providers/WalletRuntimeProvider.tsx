"use client";

import { useState } from "react";
import { detectWalletRuntime } from "@/shared/lib/wallet/detectWalletRuntime";
import { SageBridgeRuntime } from "@/shared/lib/wallet/sage-bridge/SageBridgeRuntime";
import type { WalletRuntimeKind } from "@/shared/lib/wallet/types";
import { WalletConnectRuntime } from "@/shared/lib/wallet/walletconnect/WalletConnectRuntime";
import { WalletRuntimeKindContext } from "@/shared/lib/wallet/walletRuntimeContext";

export {
  useWalletCapabilities,
  useWalletProvider,
  useWalletRuntime,
  useWalletRuntimeKind,
  useWalletState,
} from "@/shared/lib/wallet/walletRuntimeContext";
export type { WalletRuntimeContextValue } from "@/shared/lib/wallet/walletRuntimeContext";

interface WalletRuntimeProviderProps {
  children: React.ReactNode;
  /**
   * Force a transport instead of detecting it. Used by tests and by the Sage
   * verification harness; production code leaves it undefined.
   */
  runtime?: WalletRuntimeKind;
}

/**
 * Publishes the runtime kind to everything below it.
 *
 * Mount it above `NetworkProvider` so provider bootstrapping can branch on the
 * transport before an adapter exists. The kind is resolved once on mount:
 * detection is synchronous and never polls, so it cannot change under the tree.
 */
export function WalletRuntimeKindProvider({ children, runtime }: WalletRuntimeProviderProps) {
  const [kind] = useState<WalletRuntimeKind>(() => runtime ?? detectWalletRuntime());
  return (
    <WalletRuntimeKindContext.Provider value={kind}>{children}</WalletRuntimeKindContext.Provider>
  );
}

/**
 * Selects the wallet adapter and exposes it through the wallet runtime context.
 *
 * Must be mounted below `NetworkProvider` and a React Query provider: the
 * WalletConnect adapter derives its SignClient and chain id from the active
 * network. Consumers use `useWalletState()`, `useWalletProvider()` and
 * `useWalletCapabilities()` and never see the transport.
 */
export function WalletRuntimeProvider({ children, runtime }: WalletRuntimeProviderProps) {
  const [kind] = useState<WalletRuntimeKind>(() => runtime ?? detectWalletRuntime());

  if (kind === "sage-bridge") {
    return <SageBridgeRuntime>{children}</SageBridgeRuntime>;
  }

  return <WalletConnectRuntime>{children}</WalletConnectRuntime>;
}
