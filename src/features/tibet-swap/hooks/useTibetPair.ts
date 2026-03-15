"use client";

import { useQuery } from "@tanstack/react-query";
import { useTibetApi, TIBET_KEY } from "./useTibetApi";

export function useTibetPair(launcherId: string | null) {
  const api = useTibetApi();
  return useQuery({
    queryKey: [TIBET_KEY, "pair", launcherId],
    queryFn: () => api.getPair(launcherId!),
    enabled: !!launcherId,
    staleTime: 60 * 1000,
  });
}
