"use client";

import { useMemo } from "react";
import type { TibetApiPair } from "../lib/tibetTypes";
import { useTibetPairs } from "./useTibetPairs";

/**
 * Returns a Map from liquidity_asset_id → TibetApiPair.
 * Used to identify which Tibet LP token an asset ID belongs to.
 * Shares the TanStack Query cache with useTibetPairs — no extra fetch.
 */
export function useTibetLpPairMap(): Map<string, TibetApiPair> {
  const { data: pairs = [] } = useTibetPairs({ limit: 100 });
  return useMemo(() => {
    const map = new Map<string, TibetApiPair>();
    for (const pair of pairs) {
      map.set(pair.liquidity_asset_id, pair);
    }
    return map;
  }, [pairs]);
}
