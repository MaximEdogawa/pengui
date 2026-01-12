'use client'

import { useCatTokens } from '@/shared/hooks/useTickers'
import { getNativeTokenTicker } from '@/shared/lib/config/environment'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useOrderBookFiltering } from '../../composables/useOrderBookFiltering'
import { useOrderBookResize } from '../../composables/useOrderBookResize'
import { useOrderBookTooltip } from '../../composables/useOrderBookTooltip'
import { useOrderBookViewport } from '../../composables/useOrderBookViewport'
import { formatPriceForDisplay } from '../../lib/formatAmount'
import type { OrderBookOrder } from '../../lib/orderBookTypes'
import {
  calculateAveragePrice,
  calculateOrderPrice as calculateOrderPriceNumeric,
} from '../../lib/services/priceCalculation'
import { useOrderBookFilters } from '../../model/OrderBookFiltersProvider'
import { useOrderBook } from '../../model/useOrderBook'
import { useOrderBookDetails } from '../../model/useOrderBookDetails'
import OrderBookResizeHandle from './OrderBookResizeHandle'
import OrderBookTable, { OrderBookTableHeader } from './OrderBookTable'
import OrderTooltip from './OrderTooltip'

interface OrderBookContainerProps {
  filters?: {
    buyAsset?: string[]
    sellAsset?: string[]
  }
  onOrderClick: (order: OrderBookOrder) => void
}

export default function OrderBookContainer({ filters, onOrderClick }: OrderBookContainerProps) {
  const { filters: contextFilters } = useOrderBookFilters()
  const { orderBookData, orderBookLoading, orderBookHasMore, orderBookError } =
    useOrderBook(contextFilters)

  const { getCatTokenInfo } = useCatTokens()

  // Use composables for filtering, resize, and tooltip
  const { filteredBuyOrders, filteredSellOrders, calculatePriceFn } = useOrderBookFiltering(
    orderBookData,
    filters
  )

  const { sellSectionHeight, buySectionHeight, startResize } = useOrderBookResize()

  const { hoveredOrder, tooltipPosition, tooltipVisible, updateTooltipPosition, hideTooltip } =
    useOrderBookTooltip()

  // Helper function to get ticker symbol
  const getTickerSymbol = useCallback(
    (assetId: string, code?: string): string => {
      if (code) return code
      if (!assetId) return getNativeTokenTicker()
      const tickerInfo = getCatTokenInfo(assetId)
      return tickerInfo?.ticker || assetId.slice(0, 8)
    },
    [getCatTokenInfo]
  )

  // Calculate price deviation percentage for hovered order
  const priceDeviationPercent = useMemo(() => {
    if (!hoveredOrder) return null

    // Determine which order list the hovered order belongs to
    const isBuyOrder = filteredBuyOrders.includes(hoveredOrder)
    const orderList = isBuyOrder ? filteredBuyOrders : filteredSellOrders
    const orderType = isBuyOrder ? 'buy' : 'sell'

    if (orderList.length === 0) return null

    // Calculate numeric price for all orders
    const getNumericPrice = (order: OrderBookOrder) => {
      return calculateOrderPriceNumeric(order, filters, { getTickerSymbol })
    }

    // Calculate best price (lowest for sell, highest for buy)
    const prices = orderList.map(getNumericPrice).filter((p) => p > 0 && isFinite(p))
    if (prices.length === 0) return null

    const bestPrice =
      orderType === 'sell'
        ? Math.min(...prices) // Lowest price is best for sell
        : Math.max(...prices) // Highest price is best for buy

    if (!bestPrice || bestPrice <= 0 || !isFinite(bestPrice)) return null

    // Calculate current price of hovered order
    const currentPrice = getNumericPrice(hoveredOrder)
    if (!currentPrice || currentPrice <= 0 || !isFinite(currentPrice)) return null

    // If prices are exactly equal, return 0% deviation
    if (currentPrice === bestPrice) return 0

    // Calculate deviation percentage
    let deviation: number
    if (orderType === 'sell') {
      // For sell orders: ((currentPrice - bestPrice) / bestPrice) * 100
      deviation = ((currentPrice - bestPrice) / bestPrice) * 100
    } else {
      // For buy orders: ((bestPrice - currentPrice) / bestPrice) * 100
      deviation = ((bestPrice - currentPrice) / bestPrice) * 100
    }

    // Handle NaN or Infinity results
    if (!isFinite(deviation) || isNaN(deviation)) return null

    // Cap at 100% and ensure non-negative
    return Math.max(0, Math.min(100, deviation))
  }, [hoveredOrder, filteredBuyOrders, filteredSellOrders, filters, getTickerSymbol])

  // Refs for scrolling
  const sellScrollRef = useRef<HTMLDivElement>(null)
  const buyScrollRef = useRef<HTMLDivElement>(null)

  // Viewport detection for lazy loading detailed data
  const { visibleOrderIds, registerOrderElement } = useOrderBookViewport(
    filteredSellOrders,
    filteredBuyOrders,
    sellScrollRef,
    buyScrollRef
  )

  // Fetch detailed data for visible orders only
  const { detailsMap, isLoading: isLoadingDetails } = useOrderBookDetails(visibleOrderIds)

  // Calculate average price
  const averagePrice = useMemo(() => {
    if (!filters || (!filters.buyAsset && !filters.sellAsset)) {
      return 'N/A'
    }

    const bestSellOrder = filteredSellOrders[filteredSellOrders.length - 1]
    const bestBuyOrder = filteredBuyOrders[0]

    return calculateAveragePrice(
      bestSellOrder,
      bestBuyOrder,
      calculatePriceFn,
      formatPriceForDisplay
    )
  }, [filters, filteredSellOrders, filteredBuyOrders, calculatePriceFn])

  // Scroll sell side to bottom by default when orders load or change
  useEffect(() => {
    if (sellScrollRef.current && filteredSellOrders.length > 0 && !orderBookLoading) {
      // Use requestAnimationFrame to ensure DOM is fully updated
      requestAnimationFrame(() => {
        if (sellScrollRef.current) {
          sellScrollRef.current.scrollTop = sellScrollRef.current.scrollHeight
        }
      })
    }
  }, [filteredSellOrders, orderBookLoading])

  // Intersection Observer for infinite scrolling
  useEffect(() => {
    if (!buyScrollRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && orderBookHasMore && !orderBookLoading) {
          // Load more would be handled by parent component
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(buyScrollRef.current)

    return () => {
      observer.disconnect()
    }
  }, [orderBookHasMore, orderBookLoading])

  const emptyMessage = useMemo(() => {
    if (
      filters &&
      ((filters.buyAsset && filters.buyAsset.length > 0) ||
        (filters.sellAsset && filters.sellAsset.length > 0))
    ) {
      return 'No orders found matching your filters. Try adjusting your filters.'
    }
    return 'No orders found. Add filters to see orders.'
  }, [filters])

  const handleOrderClick = (order: OrderBookOrder) => {
    onOrderClick(order)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Order Book Display */}
      <div
        className="order-book-container flex-1 flex flex-col overflow-hidden rounded-xl backdrop-blur-2xl bg-white/5 dark:bg-black/5"
        style={{
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow:
            '0 0 0 1px rgba(255, 255, 255, 0.08), 0 0 30px rgba(255, 255, 255, 0.03), 0 2px 8px rgba(0, 0, 0, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Header - Fixed at top, outside scrollable sections */}
        <div>
          <OrderBookTableHeader filters={filters} />
        </div>

        {/* Sell Orders Section */}
        <div
          ref={sellScrollRef}
          className="overflow-y-scroll sell-orders-section scrollbar-thin scrollbar-thumb-gray-300/30 dark:scrollbar-thumb-gray-600/30 scrollbar-track-transparent"
          style={{
            height: `${sellSectionHeight}%`,
          }}
        >
          <OrderBookTable
            orders={filteredSellOrders}
            orderType="sell"
            filters={filters}
            onClick={handleOrderClick}
            onHover={updateTooltipPosition}
            onMouseLeave={hideTooltip}
            detailsMap={detailsMap}
            registerElement={registerOrderElement}
            isLoadingDetails={isLoadingDetails}
            isLoading={orderBookLoading}
            error={orderBookError}
            justifyEnd
            showHeader={false}
          />
        </div>

        {/* Resize Handle / Market Price Separator */}
        <OrderBookResizeHandle averagePrice={averagePrice} onMouseDown={startResize} />

        {/* Buy Orders Section */}
        <div
          ref={buyScrollRef}
          className="overflow-y-scroll buy-orders-section scrollbar-thin scrollbar-thumb-gray-300/30 dark:scrollbar-thumb-gray-600/30 scrollbar-track-transparent"
          style={{ height: `${buySectionHeight}%` }}
        >
          <OrderBookTable
            orders={filteredBuyOrders}
            orderType="buy"
            filters={filters}
            onClick={handleOrderClick}
            onHover={updateTooltipPosition}
            onMouseLeave={hideTooltip}
            detailsMap={detailsMap}
            registerElement={registerOrderElement}
            isLoadingDetails={isLoadingDetails}
            isLoading={orderBookLoading}
            error={orderBookError}
            hasMore={orderBookHasMore}
            totalOrders={orderBookData.length}
            emptyMessage={emptyMessage}
            showHeader={false}
          />
        </div>
      </div>

      {/* Order Tooltip */}
      <OrderTooltip
        order={hoveredOrder}
        visible={tooltipVisible}
        position={tooltipPosition}
        direction={hoveredOrder && filteredBuyOrders.includes(hoveredOrder) ? 'top' : 'bottom'}
        priceDeviationPercent={priceDeviationPercent}
      />
    </div>
  )
}
