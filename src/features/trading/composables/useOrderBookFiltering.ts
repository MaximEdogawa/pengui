import { useMemo } from 'react'
import type { OrderBookOrder, OrderBookFilters } from '../lib/orderBookTypes'
import {
  filterAndSortOrders,
  createBuyOrderFilter,
  createSellOrderFilter,
} from '../lib/services/orderFiltering'
import { calculateOrderPrice } from '../lib/services/priceCalculation'
import { areAssetsEqual, getTickerSymbol, isNativeToken } from '../lib/utils/assetUtils'
import { useCatTokens } from '@/shared/hooks/useTickers'

export function useOrderBookFiltering(
  orderBookData: OrderBookOrder[],
  filters: OrderBookFilters | undefined
) {
  const { getCatTokenInfo } = useCatTokens()

  // Create helper functions with dependencies
  const getTickerSymbolFn = useMemo(
    () => (assetId: string, code?: string) => getTickerSymbol(assetId, code, getCatTokenInfo),
    [getCatTokenInfo]
  )

  const isNativeTokenFn = useMemo(
    () => (asset: { id: string; code?: string }) => isNativeToken(asset, getTickerSymbolFn),
    [getTickerSymbolFn]
  )

  const areAssetsEqualFn = useMemo(
    () => (asset1: { id: string; code?: string }, asset2: { id: string; code?: string }) =>
      areAssetsEqual(asset1, asset2, getTickerSymbolFn, isNativeTokenFn),
    [getTickerSymbolFn, isNativeTokenFn]
  )

  const calculatePriceFn = useMemo(
    () => (order: OrderBookOrder) =>
      calculateOrderPrice(order, filters, { getTickerSymbol: getTickerSymbolFn }),
    [filters, getTickerSymbolFn]
  )

  // Create filter functions
  const buyOrderFilter = useMemo(
    () =>
      createBuyOrderFilter(filters, {
        getTickerSymbol: getTickerSymbolFn,
        areAssetsEqual: areAssetsEqualFn,
      }),
    [filters, getTickerSymbolFn, areAssetsEqualFn]
  )

  const sellOrderFilter = useMemo(
    () =>
      createSellOrderFilter(filters, {
        getTickerSymbol: getTickerSymbolFn,
        areAssetsEqual: areAssetsEqualFn,
      }),
    [filters, getTickerSymbolFn, areAssetsEqualFn]
  )

  // Filter and sort orders
  const filteredBuyOrders = useMemo(
    () => filterAndSortOrders(orderBookData, buyOrderFilter, false, calculatePriceFn),
    [orderBookData, buyOrderFilter, calculatePriceFn]
  )

  const filteredSellOrders = useMemo(
    () => filterAndSortOrders(orderBookData, sellOrderFilter, false, calculatePriceFn),
    [orderBookData, sellOrderFilter, calculatePriceFn]
  )

  return {
    filteredBuyOrders,
    filteredSellOrders,
    calculatePriceFn,
  }
}
