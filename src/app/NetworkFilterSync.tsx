"use client";

import { useEffect, useRef } from "react";
import { useNetwork } from "@/shared/hooks/useNetwork";
import { clearFiltersForNetworkChange } from "@/features/trading/hooks/orderBookFilterStore";

/**
 * Component that syncs network changes with order book filter state.
 * Clears all filters when network changes to prevent stale/invalid filters.
 * Must be rendered inside NetworkProvider.
 */
export function NetworkFilterSync() {
  const { network } = useNetwork();
  const prevNetworkRef = useRef<typeof network | null>(null);

  useEffect(() => {
    // Skip initial mount
    if (prevNetworkRef.current === null) {
      prevNetworkRef.current = network;
      return;
    }

    // Clear filters when network changes
    if (prevNetworkRef.current !== network) {
      clearFiltersForNetworkChange(network);
      prevNetworkRef.current = network;
    }
  }, [network]);

  // This component doesn't render anything
  return null;
}
