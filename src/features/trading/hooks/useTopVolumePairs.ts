"use client";

import { useCatTokens } from "@/entities/asset";
import { useMemo } from "react";
import type { AssetPair } from "../lib/orderBookTypes";

/**
 * Returns the top asset pairs ranked by monthly volume.
 */
export function useTopVolumePairs(count: number = 3): AssetPair[] {
  const { tickers } = useCatTokens();

  return useMemo(() => {
    if (!tickers || tickers.length === 0) return [];

    return [...tickers]
      .filter((ticker) => ticker.base_code.toLowerCase() !== ticker.target_code.toLowerCase())
      .filter(
        (ticker, index, sorted) =>
          sorted.findIndex(
            (candidate) =>
              candidate.base_code.toLowerCase() === ticker.base_code.toLowerCase() &&
              candidate.target_code.toLowerCase() === ticker.target_code.toLowerCase()
          ) === index
      )
      .sort((a, b) => (b.target_volume_30d ?? 0) - (a.target_volume_30d ?? 0))
      .slice(0, count)
      .map((t) => ({
        buyAsset: t.base_code,
        sellAsset: t.target_code,
      }));
  }, [tickers, count]);
}
