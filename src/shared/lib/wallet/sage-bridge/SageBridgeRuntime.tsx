"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { WalletRuntimeContext, type WalletRuntimeContextValue } from "../walletRuntimeContext";
import { createSageBridgeProvider, INITIAL_SAGE_BRIDGE_STATE } from "./SageBridgeProvider";
import { mapSageThemeToNextTheme } from "./sageMappers";

/**
 * Wires the Sage bridge transport into the provider-agnostic context.
 *
 * Unlike WalletConnect, the Sage adapter owns its state (it comes from bridge
 * calls and events), so this component only subscribes to the provider — it
 * never pushes state into it. Three things happen here that the adapter
 * itself cannot do without reaching into React:
 *
 * 1. Call `provider.initialize()` once on mount. A failure (not actually
 *    running inside Sage, or the bridge failed to start) is swallowed: the
 *    state stays disconnected and the login screen behaves accordingly.
 * 2. Invalidate wallet queries when the fingerprint or granted capabilities
 *    change (`wallet.selectedWallet.changed`, `grantedCapabilitiesChange`),
 *    reusing the same `["walletConnect"]` query key prefix the WalletConnect
 *    adapter's hooks already use.
 * 3. Bridge Sage's theme into `next-themes` so the rest of the app (which
 *    reads `useTheme()`, not Sage's CSS vars) follows Sage's light/dark mode.
 */
export function SageBridgeRuntime({ children }: { children: React.ReactNode }) {
  const [provider] = useState(() => createSageBridgeProvider());
  const { setTheme } = useTheme();
  const queryClient = useQueryClient();

  const state = useSyncExternalStore(
    provider.subscribe,
    provider.getState,
    () => INITIAL_SAGE_BRIDGE_STATE
  );

  useEffect(() => {
    let cancelled = false;
    let unlistenTheme: (() => void) | undefined;

    provider
      .initialize()
      .then(() => {
        if (cancelled) return;
        const client = provider.getSageClient();
        if (!client) return;

        client.environment.theme
          .getCurrent()
          .then((result) => {
            if (!cancelled) setTheme(mapSageThemeToNextTheme(result.theme));
          })
          .catch(() => {
            // Capability not granted, or the call failed; keep the app default.
          });

        unlistenTheme = client.environment.theme.onChanged((event) => {
          setTheme(mapSageThemeToNextTheme(event.theme));
        });
      })
      .catch(() => {
        // Not running inside Sage, or the bridge failed to start. The login
        // screen falls back to showing a connection error.
      });

    return () => {
      cancelled = true;
      unlistenTheme?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `provider` is stable for the component's lifetime
  }, []);

  // Invalidate wallet queries when the connected wallet or what it can do
  // changes, so balances/assets refetch instead of showing stale data.
  const invalidationKey = `${state.fingerprint ?? ""}|${JSON.stringify(state.capabilities)}`;
  const previousInvalidationKeyRef = useRef(invalidationKey);
  useEffect(() => {
    if (previousInvalidationKeyRef.current === invalidationKey) return;
    previousInvalidationKeyRef.current = invalidationKey;
    queryClient.invalidateQueries({ queryKey: ["walletConnect"] });
  }, [invalidationKey, queryClient]);

  const value = useMemo<WalletRuntimeContextValue>(
    () => ({ kind: "sage-bridge", provider, state }),
    [provider, state]
  );

  return <WalletRuntimeContext.Provider value={value}>{children}</WalletRuntimeContext.Provider>;
}
