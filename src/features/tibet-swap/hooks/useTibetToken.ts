"use client";

import { useQuery } from "@tanstack/react-query";
import { useTibetApi, TIBET_KEY } from "./useTibetApi";

export function useTibetToken(assetId: string | null) {
  const api = useTibetApi();
  return useQuery({
    queryKey: [TIBET_KEY, "token", assetId],
    queryFn: () => api.getToken(assetId!),
    enabled: !!assetId,
    staleTime: 5 * 60 * 1000,
  });
}
