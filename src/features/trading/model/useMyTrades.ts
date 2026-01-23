'use client'

import { useCallback, useEffect, useState } from 'react'
import { myTradesService, type TradeHistoryItem, type MyTradesFilters } from '@/shared/lib/services/myTradesService'
import type { StoredOffer } from '@/shared/lib/database/indexedDB'
import type { DexieHistoricalTrade } from '@/features/offers/lib/dexieTypes'
import { useWalletAddress } from '@/features/wallet/model/useWalletQueries'
import { useNetwork } from '@/shared/hooks/useNetwork'

export function useMyTrades(filters?: MyTradesFilters) {
  const { data: walletData } = useWalletAddress()
  const walletAddress = walletData?.address
  const { network } = useNetwork()
  const [myTrades, setMyTrades] = useState<TradeHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Fetch my trades directly from service (no TanStack query)
  useEffect(() => {
    if (!walletAddress) {
      setMyTrades([])
      return
    }

    setIsLoading(true)
    myTradesService
      .getMyTrades(walletAddress, network, filters)
      .then((trades) => {
        setMyTrades(trades)
        setIsLoading(false)
      })
      .catch(() => {
        setMyTrades([])
        setIsLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress, network, JSON.stringify(filters)])

  /**
   * Get trades for specific ticker
   */
  const getTradesForTicker = useCallback(
    async (tickerId: string): Promise<TradeHistoryItem[]> => {
      if (!walletAddress) {
        return []
      }
      return myTradesService.getMyTradesForTicker(tickerId, walletAddress, network)
    },
    [walletAddress, network]
  )

  /**
   * Check if a trade ID belongs to user
   */
  const isMyTrade = useCallback(
    (tradeId: string): boolean => {
      return myTrades.some((trade) => trade.trade_id === tradeId)
    },
    [myTrades]
  )

  /**
   * Convert offers to trades
   */
  const convertOffersToTrades = useCallback(
    (offers: StoredOffer[]): TradeHistoryItem[] => {
      if (!walletAddress) {
        return []
      }

      return offers
        .map((offer) => myTradesService.convertOfferToTrade(offer, walletAddress))
        .filter((trade): trade is TradeHistoryItem => trade !== null)
    },
    [walletAddress]
  )

  /**
   * Identify my trades in a list of API trades
   */
  const identifyMyTradesInList = useCallback(
    (apiTrades: DexieHistoricalTrade[]): Map<string, TradeHistoryItem> => {
      return myTradesService.identifyMyTrades(apiTrades, myTrades)
    },
    [myTrades]
  )

  /**
   * Get entry price for a ticker and trade type
   */
  const getEntryPrice = useCallback(
    (tickerId: string, tradeType: 'buy' | 'sell'): number | null => {
      return myTradesService.getEntryPrice(tickerId, walletAddress || '', tradeType, myTrades)
    },
    [walletAddress, myTrades]
  )

  return {
    myTrades,
    isLoading,
    error: null,
    getTradesForTicker,
    isMyTrade,
    convertOffersToTrades,
    identifyMyTradesInList,
    getEntryPrice,
    refetch: async () => {
      if (!walletAddress) return
      setIsLoading(true)
      try {
        const trades = await myTradesService.getMyTrades(walletAddress, network, filters)
        setMyTrades(trades)
      } catch {
        // Error handled silently
      } finally {
        setIsLoading(false)
      }
    },
  }
}
