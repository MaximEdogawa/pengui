'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useMyTrades } from './useMyTrades'
import { useTradeHistoryFilters } from './useTradeHistoryFilters'
import { resolveTickerId } from '../lib/tickerResolution'
import { useTickers } from '@/entities/asset/model/useTickers'
import { useNetwork } from '@/shared/hooks/useNetwork'
import { getDexieApiUrl } from '@/shared/lib/utils/networkUtils'
import type { OrderBookFilters } from '../lib/orderBookTypes'
import type { DexieHistoricalTrade } from '@/features/offers/lib/dexieTypes'
import type { DexieOffer } from '@/entities/offer'

export interface TradeHistoryOptions {
  filters?: OrderBookFilters
  enabled?: boolean
}

export function useTradeHistory(options: TradeHistoryOptions = {}) {
  const { filters: orderBookFilters, enabled = true } = options
  const { filters, dateRange } = useTradeHistoryFilters()
  const { network } = useNetwork()
  const { data: tickersData } = useTickers()
  const tickers = useMemo(() => tickersData?.data || [], [tickersData?.data])
  const { myTrades, identifyMyTradesInList } = useMyTrades({
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
    type: filters.tradeType === 'all' ? undefined : filters.tradeType,
  })

  const tickerId = useMemo(() => {
    if (!orderBookFilters) {
      return null
    }
    return resolveTickerId(orderBookFilters, tickers)
  }, [orderBookFilters, tickers])

  const tickerString = useMemo(() => {
    if (!tickerId) {
      return null
    }
    const ticker = tickers.find((t: { ticker_id: string }) => t.ticker_id === tickerId)
    if (!ticker) {
      return null
    }
    return `${ticker.base_code}_${ticker.target_code}`
  }, [tickerId, tickers])

  const queryKey = useMemo(() => {
    const buyAssets = orderBookFilters?.buyAsset || []
    const sellAssets = orderBookFilters?.sellAsset || []
    const buyKey = [...buyAssets].sort().join(',')
    const sellKey = [...sellAssets].sort().join(',')
    const tickerIdFallback = tickerId || ''
    
    return ['trade-history', network, buyKey, sellKey, tickerIdFallback]
  }, [network, orderBookFilters?.buyAsset, orderBookFilters?.sellAsset, tickerId])

  // Helper function to convert completed offers to trade format
  const convertOfferToTrade = (offer: DexieOffer): DexieHistoricalTrade | null => {
    if (!offer.date_completed) {
      return null
    }

    const offeredAsset = offer.offered?.[0]
    const requestedAsset = offer.requested?.[0]

    if (!offeredAsset || !requestedAsset) {
      return null
    }

    const price = offeredAsset.amount > 0 && requestedAsset.amount > 0
      ? requestedAsset.amount / offeredAsset.amount
      : offer.price || 0

    if (price <= 0) {
      return null
    }

    const volume = offeredAsset.amount || 0
    const timestamp = new Date(offer.date_completed).getTime()

    return {
      trade_id: offer.id,
      ticker_id: tickerId || undefined,
      price,
      base_volume: volume,
      trade_timestamp: Math.floor(timestamp / 1000),
      type: 'buy',
    }
  }

  // Fetch completed offers from API (recent trades)
  // Endpoint: /v1/offers?offered_or_requested={tickerString}&status=4&sort=date_completed&compact=true
  // status=4 means completed offers
  const apiTradesQuery = useQuery({
    queryKey,
    queryFn: async () => {
      if (!tickerString) {
        return []
      }

      const dexieApiBaseUrl = getDexieApiUrl(network)
      const queryParams = new URLSearchParams()
      queryParams.append('offered_or_requested', tickerString)
      queryParams.append('status', '4')
      queryParams.append('sort', 'date_completed')
      queryParams.append('compact', 'true')
      queryParams.append('page_size', '1000')
      
      const response = await fetch(`${dexieApiBaseUrl}/v1/offers?${queryParams.toString()}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch completed offers: ${response.status}`)
      }

      const data = await response.json()
      
      let offersData: DexieOffer[] = []
      if (Array.isArray(data)) {
        offersData = data as DexieOffer[]
      } else if (data && typeof data === 'object') {
        if (Array.isArray((data as { data?: unknown[] }).data)) {
          offersData = (data as { data: DexieOffer[] }).data
        } else if (Array.isArray((data as { offers?: unknown[] }).offers)) {
          offersData = (data as { offers: DexieOffer[] }).offers
        }
      }

      return offersData
        .map(convertOfferToTrade)
        .filter((trade): trade is DexieHistoricalTrade => trade !== null)
    },
    enabled: enabled && !!tickerString && !filters.myTradesOnly,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
  })

  const trades = useMemo(() => {
    if (filters.myTradesOnly) {
      return myTrades.filter((trade) => {
        if (tickerId && trade.ticker_id !== tickerId) {
          return false
        }
        if (dateRange) {
          if (trade.timestamp < dateRange.from.getTime()) {
            return false
          }
          if (trade.timestamp > dateRange.to.getTime()) {
            return false
          }
        }
        if (filters.tradeType !== 'all' && trade.type !== filters.tradeType) {
          return false
        }
        return true
      })
    }

    const apiTrades = Array.isArray(apiTradesQuery.data) 
      ? (apiTradesQuery.data as DexieHistoricalTrade[])
      : []
    
    if (apiTrades.length === 0) {
      return []
    }
    
    const myTradesMap = identifyMyTradesInList(apiTrades)

    const combinedTrades: Array<DexieHistoricalTrade & { isMyTrade?: boolean; profitLoss?: number; profitLossPercent?: number }> = apiTrades.map((trade) => {
      const myTrade = myTradesMap.get(trade.trade_id || '')
      return {
        ...trade,
        isMyTrade: !!myTrade,
        profitLoss: myTrade?.profitLoss,
        profitLossPercent: myTrade?.profitLossPercent,
      }
    })

    let filtered = combinedTrades

    if (dateRange) {
      filtered = filtered.filter((trade) => {
        const timestamp = trade.trade_timestamp 
          ? trade.trade_timestamp * 1000
          : (trade.timestamp || 0)
        
        if (timestamp === 0) {
          return true
        }
        
        return timestamp >= dateRange.from.getTime() && timestamp <= dateRange.to.getTime()
      })
    }

    if (filters.tradeType !== 'all') {
      filtered = filtered.filter((trade) => {
        const tradeType = trade.type || trade.side || 'buy'
        return tradeType === filters.tradeType
      })
    }

    return filtered
  }, [
    filters.myTradesOnly,
    filters.tradeType,
    myTrades,
    apiTradesQuery.data,
    identifyMyTradesInList,
    tickerId,
    dateRange,
  ])

  return {
    trades,
    isLoading: filters.myTradesOnly ? false : apiTradesQuery.isLoading,
    error: apiTradesQuery.error,
    tickerId,
  }
}
