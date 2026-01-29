"use client";

import { useCallback, useEffect, useState } from "react";
import {
  myTradesService,
  type TradeHistoryItem,
  type MyTradesFilters,
} from "@/shared/lib/services/myTradesService";
import type { StoredOffer } from "@/shared/lib/database/indexedDB";
import type { DexieHistoricalTrade } from "@/features/offers/lib/dexieTypes";
import { useNetwork } from "@/shared/hooks/useNetwork";
import { useWalletAddress } from "@/features/wallet/hooks/useWalletQueries";

export function useMyTrades(filters?: MyTradesFilters) {
  const { data: walletData } = useWalletAddress();
  const walletAddress = walletData?.address;
  const { network } = useNetwork();
  const [myTrades, setMyTrades] = useState<TradeHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch my trades directly from service (no TanStack query)
  useEffect(() => {
    if (!walletAddress) {
      setMyTrades([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    myTradesService
      .getMyTrades(walletAddress, network, filters)
      .then((trades) => {
        setMyTrades(trades);
        setError(null);
        setIsLoading(false);
      })
      .catch((err) => {
        setMyTrades([]);
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress, network, JSON.stringify(filters)]);

  /**
   * Get trades for specific ticker
   */
  const getTradesForTicker = useCallback(
    async (tickerId: string): Promise<TradeHistoryItem[]> => {
      if (!walletAddress) {
        return [];
      }
      return myTradesService.getMyTradesForTicker(
        tickerId,
        walletAddress,
        network,
      );
    },
    [walletAddress, network],
  );

  /**
   * Check if a trade ID belongs to user
   */
  const isMyTrade = useCallback(
    (tradeId: string): boolean => {
      return myTrades.some((trade) => trade.trade_id === tradeId);
    },
    [myTrades],
  );

  /**
   * Convert offers to trades
   */
  const convertOffersToTrades = useCallback(
    (offers: StoredOffer[]): TradeHistoryItem[] => {
      if (!walletAddress) {
        return [];
      }

      return offers
        .map((offer) =>
          myTradesService.convertOfferToTrade(offer, walletAddress),
        )
        .filter((trade): trade is TradeHistoryItem => trade !== null);
    },
    [walletAddress],
  );

  /**
   * Identify my trades in a list of API trades
   */
  const identifyMyTradesInList = useCallback(
    (apiTrades: DexieHistoricalTrade[]): Map<string, TradeHistoryItem> => {
      return myTradesService.identifyMyTrades(apiTrades, myTrades);
    },
    [myTrades],
  );

  /**
   * Get entry price for a ticker and trade type
   */
  const getEntryPrice = useCallback(
    (tickerId: string, tradeType: "buy" | "sell"): number | null => {
      return myTradesService.getEntryPrice(
        tickerId,
        walletAddress || "",
        tradeType,
        myTrades,
      );
    },
    [walletAddress, myTrades],
  );

  return {
    myTrades,
    isLoading,
    error,
    getTradesForTicker,
    isMyTrade,
    convertOffersToTrades,
    identifyMyTradesInList,
    getEntryPrice,
    refetch: async () => {
      if (!walletAddress) return;
      setIsLoading(true);
      try {
        const trades = await myTradesService.getMyTrades(
          walletAddress,
          network,
          filters,
        );
        setMyTrades(trades);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    },
  };
}
