"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useNetwork } from "@/shared/hooks/useNetwork";
import { networkToChainId } from "@/shared/lib/utils/networkUtils";
import { WalletRuntimeContext, type WalletRuntimeContextValue } from "../walletRuntimeContext";
import type { WalletState } from "../types";
import {
  createWalletConnectProvider,
  WALLET_CONNECT_CAPABILITIES,
  type WalletConnectBindings,
} from "./WalletConnectProvider";
import { buildWalletConnectSession } from "./session";
import { useWalletConnectSessionState } from "./useWalletConnectSessionState";
import { useWalletConnectSignClient } from "./useWalletConnectSignClient";

/** Capabilities never change for WalletConnect, so the object can be frozen. */
const CAPABILITIES = Object.freeze({ ...WALLET_CONNECT_CAPABILITIES });

/**
 * Wires the WalletConnect transport into the provider-agnostic context.
 *
 * The provider instance is created once and reads its SignClient and session
 * through a ref that is refreshed on every render, so provider identity — and
 * therefore the context value — only changes when the wallet state actually
 * changes. See pengui-wiki/development/infinite-loop-guardrails.md.
 */
export function WalletConnectRuntime({ children }: { children: React.ReactNode }) {
  const { signClient } = useWalletConnectSignClient();
  const {
    isConnected,
    address,
    walletName,
    walletConnectSession,
    selectedSession,
    fingerprintMap,
  } = useWalletConnectSessionState();
  const { network } = useNetwork();

  const session = useMemo(
    () =>
      buildWalletConnectSession({
        walletConnectSession,
        selectedSession,
        fingerprintMap,
        isConnected,
        defaultChainId: networkToChainId(network),
      }),
    [walletConnectSession, selectedSession, fingerprintMap, isConnected, network]
  );

  const bindingsRef = useRef<WalletConnectBindings>({ signClient, session, network });
  // Refresh during render so provider calls made in the same commit (query
  // functions, mutation handlers) always see the current SignClient.
  bindingsRef.current = { signClient, session, network };

  const [provider] = useState(() => createWalletConnectProvider(() => bindingsRef.current));

  const state = useMemo<WalletState>(
    () => ({
      kind: "walletconnect",
      isConnected: session.isConnected,
      isReady: signClient != null && session.isConnected,
      fingerprint: session.isConnected && session.fingerprint ? session.fingerprint : null,
      address: address ?? null,
      network,
      walletName: walletName ?? null,
      capabilities: CAPABILITIES,
    }),
    [session, signClient, address, walletName, network]
  );

  // Publish to imperative subscribers (`provider.subscribe`). React consumers
  // read `state` straight from the context, so they never lag a commit behind.
  useEffect(() => {
    provider.setState(state);
  }, [provider, state]);

  const value = useMemo<WalletRuntimeContextValue>(
    () => ({ kind: "walletconnect", provider, state }),
    [provider, state]
  );

  return <WalletRuntimeContext.Provider value={value}>{children}</WalletRuntimeContext.Provider>;
}
