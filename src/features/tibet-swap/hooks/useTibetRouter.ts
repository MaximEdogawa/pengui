"use client";

import { useQuery } from "@tanstack/react-query";
import { useTibetApi, TIBET_KEY } from "./useTibetApi";

export function useTibetRouter(rcat?: boolean) {
  const api = useTibetApi();
  return useQuery({
    queryKey: [TIBET_KEY, "router", rcat],
    queryFn: () => api.getRouter(rcat !== undefined ? { rcat } : undefined),
    staleTime: 5 * 60 * 1000,
  });
}
