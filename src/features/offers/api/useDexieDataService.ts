'use client'

import { useDexieSearch } from './hooks/useDexieSearch'
import { useDexieInspect } from './hooks/useDexieInspect'
import { useDexieUpload } from './hooks/useDexieUpload'
import { useDexieMarketData } from './hooks/useDexieMarketData'
import { useDexieUtils } from './hooks/useDexieUtils'

/**
 * Main hook for Dexie data service
 * Composed from smaller hooks for better maintainability
 */
export function useDexieDataService() {
  const search = useDexieSearch()
  const inspect = useDexieInspect()
  const upload = useDexieUpload()
  const marketData = useDexieMarketData()
  const utils = useDexieUtils()

  const isLoading =
    search.searchOffersMutation.isPending ||
    inspect.inspectOfferMutation.isPending ||
    marketData.getOrderBookMutation.isPending ||
    marketData.getHistoricalTradesMutation.isPending ||
    upload.postOfferMutation.isPending

  return {
    // Search
    pairsQuery: search.pairsQuery,
    searchOffers: search.searchOffers,
    searchOffersMutation: search.searchOffersMutation,
    isSearching: search.isSearching,

    // Inspect
    inspectOffer: inspect.inspectOffer,
    inspectOfferWithPolling: inspect.inspectOfferWithPolling,
    inspectOfferMutation: inspect.inspectOfferMutation,
    isInspecting: inspect.isInspecting,

    // Upload
    postOffer: upload.postOffer,
    postOfferMutation: upload.postOfferMutation,
    isPosting: upload.isPosting,

    // Market Data
    getOrderBook: marketData.getOrderBook,
    getHistoricalTrades: marketData.getHistoricalTrades,
    getOrderBookMutation: marketData.getOrderBookMutation,
    getHistoricalTradesMutation: marketData.getHistoricalTradesMutation,
    isGettingOrderBook: marketData.isGettingOrderBook,
    isGettingTrades: marketData.isGettingTrades,

    // Utils
    refreshPairs: utils.refreshPairs,
    refreshOffers: utils.refreshOffers,
    validateOfferString: utils.validateOfferString,

    // Legacy compatibility
    offers: [],
    currentOffer: null,
    isLoading,
    error: null,
  }
}
