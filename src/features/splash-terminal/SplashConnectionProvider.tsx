"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { useNetwork } from "@/shared/hooks/useNetwork";
import { getDexieSplashRelayUrl } from "@/shared/lib/utils/networkUtils";
import { useQueryClient } from "@tanstack/react-query";
import { useOrderBookFilterStore } from "@/features/trading/hooks/orderBookFilterStore";
import type { DexieOffer } from "@/entities/offer";
import { useSplashWasm, type UseSplashWasmResult } from "./useSplashWasm";

// ── filter-match helper (same logic as StreamContainer) ─────────────────
function offerMatchesPairFilter(
  offer: DexieOffer,
  buyAssets: string[],
  sellAssets: string[],
): boolean {
  if (buyAssets.length === 0 && sellAssets.length === 0) return true;
  if (!offer.offered?.length && !offer.requested?.length) return false;

  const norm = (s: string) => {
    const u = s.toUpperCase();
    return u === "TXCH" ? "XCH" : u;
  };

  const offeredCodes = new Set(
    (offer.offered || []).map((a) => norm(a.code ?? "")),
  );
  const requestedCodes = new Set(
    (offer.requested || []).map((a) => norm(a.code ?? "")),
  );

  const nBuy = buyAssets.map(norm);
  const nSell = sellAssets.map(norm);

  const dir1 =
    (nBuy.length === 0 || nBuy.some((b) => requestedCodes.has(b))) &&
    (nSell.length === 0 || nSell.some((s) => offeredCodes.has(s)));
  const dir2 =
    (nBuy.length === 0 || nBuy.some((b) => offeredCodes.has(b))) &&
    (nSell.length === 0 || nSell.some((s) => requestedCodes.has(s)));

  return dir1 || dir2;
}

// ── context ─────────────────────────────────────────────────────────────
const SplashConnectionContext = createContext<UseSplashWasmResult | null>(null);

/**
 * Provides a single WASM connection to the entire trading area.
 *
 * - Initialises and connects to the Splash relay once.
 * - Listens for incoming offers and automatically invalidates the
 *   order-book React-Query cache when a matching offer arrives.
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
  const queryClient = useQueryClient();

  // We need a ref so the offers callback always sees the latest queryClient
  // without re-registering the listener every render.
  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;

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
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // ── auto-invalidate order book when matching stream offers arrive ──
  useEffect(() => {
    const cleanup = wasm.onOffers((newOffers: DexieOffer[]) => {
      const { buyAsset, sellAsset } =
        useOrderBookFilterStore.getState().filters;
      const curBuy = buyAsset ?? [];
      const curSell = sellAsset ?? [];

      if (curBuy.length === 0 && curSell.length === 0) return;

      const hasMatch = newOffers.some(
        (o) =>
          o.id &&
          o.offered?.length &&
          offerMatchesPairFilter(o, curBuy, curSell),
      );
      if (hasMatch) {
        queryClientRef.current.invalidateQueries({
          queryKey: ["orderBook"],
        });
      }
    });
    return cleanup;
  }, [wasm]);

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
