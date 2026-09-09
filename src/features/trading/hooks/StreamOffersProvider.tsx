"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { DexieOffer } from "@/entities/offer";
import { useDexieDataService } from "@/features/offers/api/useDexieDataService";
import { useSplashConnection } from "@/features/splash-terminal/SplashConnectionProvider";
import { useNetwork } from "@/shared/hooks/useNetwork";
import { buildOrderBookSearchParams } from "../lib/orderBookParams";

/** Offers kept in memory for the session; matches the WASM stream buffer cap. */
const MAX_STREAM_OFFERS = 10_000;
/** Page size for the one-shot Dexie snapshot that seeds the list on page load. */
const SNAPSHOT_PAGE_SIZE = 100;

export interface StreamOffersContextValue {
  /** Dexie snapshot (initial load) merged with everything the stream has delivered this session. */
  offers: DexieOffer[];
  /** Number of offers received from the Splash stream since the page was loaded. */
  streamReceived: number;
  /** True while the initial Dexie snapshot is still loading. */
  isSnapshotLoading: boolean;
}

const StreamOffersContext = createContext<StreamOffersContextValue | null>(null);

/** Key an offer by its id, falling back to the offer string for un-enriched stubs. */
function offerKey(offer: DexieOffer): string {
  return offer.id || offer.offer || "";
}

/**
 * Merge offers into an existing list: known offers are replaced with the newer
 * version (the stream re-broadcasts offers as their state changes), unknown
 * offers are appended. Same behaviour as the order book's stream merge.
 */
export function mergeStreamOffers(prev: DexieOffer[], incoming: DexieOffer[]): DexieOffer[] {
  const byKey = new Map<string, DexieOffer>();
  for (const offer of prev) {
    const key = offerKey(offer);
    if (key) byKey.set(key, offer);
  }
  for (const offer of incoming) {
    const key = offerKey(offer);
    if (key) byKey.set(key, offer);
  }
  const merged = Array.from(byKey.values());
  return merged.length > MAX_STREAM_OFFERS ? merged.slice(-MAX_STREAM_OFFERS) : merged;
}

/**
 * Holds the live offer stream for the whole trading session.
 *
 * Mounted above the view switch (trading page / offers page) so the offers and
 * the Splash subscription survive tab switches: the stream keeps accumulating
 * while another tab is on screen, and the list is only reset by a full page
 * reload (or a network switch, where the previous network's offers no longer
 * apply).
 *
 * The initial list comes from a single Dexie snapshot per page load; the stream
 * is only responsible for keeping it live afterwards - the same pattern
 * `useOrderBook` uses for the order book.
 */
export function StreamOffersProvider({ children }: { children: React.ReactNode }) {
  const { network } = useNetwork();
  const { searchOffers } = useDexieDataService();
  const { onOffers } = useSplashConnection();
  const [streamOffers, setStreamOffers] = useState<DexieOffer[]>([]);
  const [streamReceived, setStreamReceived] = useState(0);

  /** Query: initial offer list from Dexie. Fetched once per page load; the stream keeps it current. */
  const snapshotQuery = useQuery<DexieOffer[]>({
    queryKey: ["offers", "stream", "snapshot", network],
    queryFn: async () => {
      const response = await searchOffers(
        buildOrderBookSearchParams({
          page: 0,
          pagination: SNAPSHOT_PAGE_SIZE,
          network,
          buyAsset: null,
          sellAsset: null,
        })
      );
      if (!response.success || !Array.isArray(response.data)) return [];
      return response.data as DexieOffer[];
    },
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  });

  // Subscribe for as long as this provider is mounted, so offers broadcast while
  // another tab is on screen are still applied. Only a network change resets the list.
  useEffect(() => {
    setStreamOffers([]);
    setStreamReceived(0);

    return onOffers((incoming) => {
      if (incoming.length === 0) return;
      setStreamOffers((prev) => mergeStreamOffers(prev, incoming));
      setStreamReceived((count) => count + incoming.length);
    });
  }, [onOffers, network]);

  const offers = useMemo(
    () => mergeStreamOffers(snapshotQuery.data ?? [], streamOffers),
    [snapshotQuery.data, streamOffers]
  );

  const value = useMemo(
    () => ({ offers, streamReceived, isSnapshotLoading: snapshotQuery.isLoading }),
    [offers, streamReceived, snapshotQuery.isLoading]
  );

  return <StreamOffersContext.Provider value={value}>{children}</StreamOffersContext.Provider>;
}

/**
 * Access the session-wide offer stream.
 * Must be used inside a <StreamOffersProvider>.
 */
export function useStreamOffers(): StreamOffersContextValue {
  const ctx = useContext(StreamOffersContext);
  if (!ctx) {
    throw new Error("useStreamOffers must be used inside <StreamOffersProvider>");
  }
  return ctx;
}
