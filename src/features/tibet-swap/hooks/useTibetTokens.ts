"use client";

import { useQuery } from "@tanstack/react-query";
import { useTibetApi, TIBET_KEY } from "./useTibetApi";

export function useTibetTokens() {
  const api = useTibetApi();
  return useQuery({
    queryKey: [TIBET_KEY, "tokens"],
    queryFn: () => api.getTokens(),
    staleTime: 5 * 60 * 1000,
  });
}
