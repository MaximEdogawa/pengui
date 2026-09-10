"use client";

import { useQuery } from "@tanstack/react-query";
import type { TibetApiPair } from "../lib/tibetTypes";
import { useTibetApi, TIBET_KEY } from "./useTibetApi";

export interface UseTibetPairsParams {
  skip?: number;
  limit?: number;
}

/** Pairs requested per request when fetching the whole list. */
const PAGE_SIZE = 200;
/** Safety net so a misbehaving API cannot spin the paging loop forever. */
const MAX_PAGES = 25;

/**
 * Tibet pairs.
 *
 * With no params the **whole** list is fetched, page by page. A fixed first page
 * is not enough: the swap tab resolves the selected pair by looking the token up
 * in this list, and Tibet returns pairs in an order that puts common tokens well
 * past the first hundred (BYC - the default mainnet pair - sits around index 300
 * of ~374). Anything missing from the list renders as "Select assets using the
 * filter above" even though the user has a pair selected.
 *
 * Pass `skip`/`limit` explicitly to fetch a single page instead.
 */
export function useTibetPairs(params?: UseTibetPairsParams) {
  const api = useTibetApi();
  const { skip, limit } = params ?? {};
  const singlePage = skip !== undefined || limit !== undefined;

  return useQuery<TibetApiPair[]>({
    queryKey: [TIBET_KEY, "pairs", singlePage ? { skip: skip ?? 0, limit } : "all"],
    queryFn: async () => {
      if (singlePage) {
        return api.getPairs({ skip: skip ?? 0, limit });
      }

      const fetchFrom = async (page: number): Promise<TibetApiPair[]> => {
        const batch = await api.getPairs({ skip: page * PAGE_SIZE, limit: PAGE_SIZE });
        // A short page means the end of the list.
        if (batch.length < PAGE_SIZE || page + 1 >= MAX_PAGES) return batch;
        return [...batch, ...(await fetchFrom(page + 1))];
      };

      return fetchFrom(0);
    },
    staleTime: 2 * 60 * 1000,
  });
}
