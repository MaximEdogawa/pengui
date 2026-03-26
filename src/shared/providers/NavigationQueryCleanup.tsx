"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useNavigationProgress } from "./NavigationProgressProvider";

/**
 * Cancels in-flight wallet/API queries shortly after a navigation starts.
 * On 3G networks, the ongoing WalletConnect relay traffic (batch CAT
 * balance queries) saturates the connection and prevents Next.js from
 * fetching the new route's JS chunk. Cancelling these queries frees
 * bandwidth so the page transition can complete.
 *
 * A short delay is used so the synchronous React Query store updates
 * from cancellation don't interrupt the Next.js navigation transition
 * (which runs inside startTransition at a lower priority).
 *
 * Must be rendered inside both NavigationProgressProvider and ReactQueryProvider.
 */
export function NavigationQueryCleanup() {
  const { isNavigating } = useNavigationProgress();
  const queryClient = useQueryClient();
  const prevNavigatingRef = useRef(false);

  useEffect(() => {
    if (isNavigating && !prevNavigatingRef.current) {
      const timer = setTimeout(() => {
        queryClient.cancelQueries({ queryKey: ["walletConnect", "balance"] });
        queryClient.cancelQueries({ queryKey: ["spacescan"] });
        queryClient.cancelQueries({ queryKey: ["spacescan", "all-tokens"] });
      }, 150);
      prevNavigatingRef.current = isNavigating;
      return () => clearTimeout(timer);
    }
    prevNavigatingRef.current = isNavigating;
  }, [isNavigating, queryClient]);

  return null;
}
