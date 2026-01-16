'use client'

import { useCatTokens } from '@/shared/hooks'
import { useNetwork } from '@/shared/hooks/useNetwork'
import { getNativeTokenTickerForNetwork } from '@/shared/lib/config/environment'
import { useMemo, useCallback } from 'react'
import { useOrderBookFiltering } from '../../../composables/useOrderBookFiltering'
import { calculateOrderPrice as calculateOrderPriceNumeric } from '../../../lib/services/priceCalculation'
import { calculateOrderType, calculatePriceDeviation } from '../utils/priceUtils'
import type { OrderBookFilters, OrderBookOrder } from '../../../lib/orderBookTypes'
import { useOrderBook } from '../../../model/useOrderBook'
import { useOrderBookFilters } from '../../../model/OrderBookFiltersProvider'

export function useOrderPrice(order: OrderBookOrder | undefined, filters?: OrderBookFilters) {
  const { network } = useNetwork()
  const { getCatTokenInfo } = useCatTokens()
  const { filters: contextFilters } = useOrderBookFilters()
  const { orderBookData } = useOrderBook(contextFilters)
  const { filteredBuyOrders, filteredSellOrders } = useOrderBookFiltering(orderBookData, filters)

  const getTickerSymbolForPrice = useCallback(
    (assetId: string, code?: string): string => {
      if (code) return code
      if (!assetId) return getNativeTokenTickerForNetwork(network)
      const tickerInfo = getCatTokenInfo(assetId)
      return tickerInfo?.ticker || assetId.slice(0, 8)
    },
    [getCatTokenInfo, network]
  )

  const orderType = useMemo(
    () => calculateOrderType(order, filters, network, getCatTokenInfo),
    [order, filters, network, getCatTokenInfo]
  )

  const priceDeviationPercent = useMemo(
    () =>
      calculatePriceDeviation({
        order,
        filteredBuyOrders,
        filteredSellOrders,
        filters,
        getTickerSymbol: getTickerSymbolForPrice,
      }),
    [order, filteredBuyOrders, filteredSellOrders, filters, getTickerSymbolForPrice]
  )

  const orderPrice = useMemo(() => {
    if (!order || !filters) return null
    const numericPrice = calculateOrderPriceNumeric(order, filters, {
      getTickerSymbol: getTickerSymbolForPrice,
    })
    if (!isFinite(numericPrice) || numericPrice <= 0) return null
    return numericPrice
  }, [order, filters, getTickerSymbolForPrice])

  const getPriceHeaderTicker = useCallback((): string => {
    if (filters?.buyAsset && filters.buyAsset.length > 0) {
      return filters.buyAsset[0]
    }
    if (filters?.sellAsset && filters.sellAsset.length > 0) {
      return filters.sellAsset[0]
    }
    return getNativeTokenTickerForNetwork(network)
  }, [filters, network])

  const getTickerSymbol = useCallback(
    (assetId: string | undefined, symbol?: string) => {
      if (symbol) return symbol
      if (!assetId) return 'XCH'
      const tickerInfo = getCatTokenInfo(assetId)
      return tickerInfo?.ticker || assetId.slice(0, 8)
    },
    [getCatTokenInfo]
  )

  return {
    orderType,
    orderPrice,
    priceDeviationPercent,
    getPriceHeaderTicker,
    getTickerSymbol,
  }
}
