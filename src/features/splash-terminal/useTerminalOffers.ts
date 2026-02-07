"use client";

import type { DexieOffer } from "@/entities/offer";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { TerminalFilterParams } from "./types";

export const TERMINAL_OFFERS_QUERY_KEY = "offers";
export const TERMINAL_QUERY_KEY = "terminal";
const MAX_CACHED_OFFERS = 10_000;

function mergeOffersIntoCache(prev: DexieOffer[] | undefined, offers: DexieOffer[]): DexieOffer[] {
  const byId = new Map((prev ?? []).map((o) => [o.id, o]));
  for (const o of offers) byId.set(o.id, o);
  return Array.from(byId.values()).slice(-MAX_CACHED_OFFERS);
}

export function buildTerminalQueryKey(
  filterParams: TerminalFilterParams,
): unknown[] {
  return [
    TERMINAL_OFFERS_QUERY_KEY,
    TERMINAL_QUERY_KEY,
    filterParams.assetPair ?? "",
    filterParams.priceMin ?? "",
    filterParams.priceMax ?? "",
    filterParams.amountMin ?? "",
  ];
}

export function useTerminalOffersSync(filterParams: TerminalFilterParams) {
  const queryClient = useQueryClient();
  const key = buildTerminalQueryKey(filterParams);

  const setCachedOffers = useCallback(
    (offers: DexieOffer[]) => {
      queryClient.setQueryData<DexieOffer[]>(key, (prev) =>
        mergeOffersIntoCache(prev, offers),
      );
    },
    [queryClient, key],
  );

  const appendCachedOffers = useCallback(
    (offers: DexieOffer[]) => {
      queryClient.setQueryData<DexieOffer[]>(key, (prev) =>
        mergeOffersIntoCache(prev, offers),
      );
    },
    [queryClient, key],
  );

  return { setCachedOffers, appendCachedOffers, queryKey: key };
}
