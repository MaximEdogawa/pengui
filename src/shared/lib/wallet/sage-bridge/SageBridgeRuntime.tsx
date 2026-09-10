"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { WalletRuntimeContext, type WalletRuntimeContextValue } from "../walletRuntimeContext";
import { createSageBridgeProvider, INITIAL_SAGE_BRIDGE_STATE } from "./SageBridgeProvider";

/**
 * Sage runtime placeholder.
 *
 * Unlike WalletConnect, the Sage adapter owns its state (it comes from bridge
 * events), so the component subscribes to the provider instead of pushing into
 * it. TASK-001.02 fills in the provider; this wiring already publishes whatever
 * the provider reports.
 */
export function SageBridgeRuntime({ children }: { children: React.ReactNode }) {
  const [provider] = useState(() => createSageBridgeProvider());

  const state = useSyncExternalStore(
    provider.subscribe,
    provider.getState,
    () => INITIAL_SAGE_BRIDGE_STATE
  );

  const value = useMemo<WalletRuntimeContextValue>(
    () => ({ kind: "sage-bridge", provider, state }),
    [provider, state]
  );

  return <WalletRuntimeContext.Provider value={value}>{children}</WalletRuntimeContext.Provider>;
}
