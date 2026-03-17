"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { useNetwork } from "@/shared/hooks/useNetwork";
import { getDexieSplashRelayUrl } from "@/shared/lib/utils/networkUtils";
import { useSplashWasm, type UseSplashWasmResult } from "./useSplashWasm";

// ── context ─────────────────────────────────────────────────────────────
const SplashConnectionContext = createContext<UseSplashWasmResult | null>(null);

/**
 * Provides a single WASM connection to the entire trading area.
 *
 * - Initialises and connects to the Splash relay once.
 * - Children (StreamContainer, order book, form hooks, …) share one
 *   connection instead of each creating their own.
 */
export function SplashConnectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const wasm = useSplashWasm();
  const { network } = useNetwork();
  const relayUrl = getDexieSplashRelayUrl(network);

  // ── connect once when relay URL / network changes ──────────────────
  // Use AbortController so when the effect cleans up (e.g. React Strict Mode remount),
  // the in-flight initAndConnect is abandoned and we don't end up with two WASM nodes
  // (which causes "memory access out of bounds").
  useEffect(() => {
    if (!relayUrl) return;
    const abort = new AbortController();
    wasm.initAndConnect(relayUrl, network, abort.signal).catch(() => {});
    return () => {
      abort.abort();
      wasm.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reconnect on URL/network change
  }, [relayUrl, network]);

  // ── disconnect when tab is hidden to avoid WASM touching a suspended WebSocket ──
  // (iOS/safari invalidates the WebSocket when the tab is backgrounded; libp2p then
  // accesses .bufferedAmount on a dead object. We do NOT reconnect on visible: doing so
  // can trigger "FnOnce called more than once" and out-of-bounds memory access because
  // the WASM state is not safe to re-init while teardown may still be in progress.)
  const wasmRef = useRef(wasm);
  wasmRef.current = wasm;
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        wasmRef.current.disconnect();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  return (
    <SplashConnectionContext.Provider value={wasm}>
      {children}
    </SplashConnectionContext.Provider>
  );
}

/**
 * Access the shared Splash WASM connection.
 * Must be used inside a <SplashConnectionProvider>.
 */
export function useSplashConnection(): UseSplashWasmResult {
  const ctx = useContext(SplashConnectionContext);
  if (!ctx) {
    throw new Error(
      "useSplashConnection must be used inside <SplashConnectionProvider>",
    );
  }
  return ctx;
}
