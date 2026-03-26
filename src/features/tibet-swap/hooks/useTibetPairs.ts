"use client";

import { useQuery } from "@tanstack/react-query";
import { useTibetApi, TIBET_KEY } from "./useTibetApi";

export interface UseTibetPairsParams {
  skip?: number;
  limit?: number;
}

export function useTibetPairs(params?: UseTibetPairsParams) {
  const api = useTibetApi();
  const { skip = 0, limit = 100 } = params ?? {};
  return useQuery({
    queryKey: [TIBET_KEY, "pairs", skip, limit],
    queryFn: () => api.getPairs({ skip, limit }),
    staleTime: 2 * 60 * 1000,
  });
}
