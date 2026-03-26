"use client";

import { useTickers } from "@/entities/asset/hooks/useTickers";
import { useNetwork } from "@/shared/hooks/useNetwork";
import { useMemo } from "react";

/**
 * XCH/USD price derived from the BYC (Bytecash) / XCH pair on Dexie.
 *
 * BYC is dollar-pegged (~$1). Its Dexie `last_price` = how much XCH one BYC
 * is worth.  Inverting it gives the XCH price in USD: `1 / last_price`.
 */
export function useXchUsdPrice(): {
  priceUsd: number | null;
  isLoading: boolean;
  isError: boolean;
} {
  const { network } = useNetwork();
  const { data, isLoading, isError } = useTickers();

  const priceUsd = useMemo(() => {
    if (!data?.success || !Array.isArray(data.data)) return null;

    const xchTarget = network === "testnet" ? "TXCH" : "XCH";

    for (const t of data.data) {
      if (t.base_code !== "BYC") continue;
      if (t.target_code !== xchTarget && t.target_code !== "XCH") continue;

      const price = Number(t.last_price);
      if (price > 0 && !isNaN(price)) return 1 / price;
    }

    return null;
  }, [data, network]);

  return { priceUsd, isLoading, isError };
}
