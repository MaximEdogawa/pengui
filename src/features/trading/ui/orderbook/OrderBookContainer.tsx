'use client'

import { useCatTokens } from '@/entities/asset'
import { getNativeTokenTickerForNetwork } from '@/shared/lib/config/environment'
import { useNetwork } from '@/shared/hooks/useNetwork'
import { useCallback, useMemo, useRef } from 'react'
import { useOrderBookFiltering } from '../../composables/useOrderBookFiltering'
import { useOrderBookPriceDeviation } from '../../composables/useOrderBookPriceDeviation'
import { useOrderBookResize } from '../../composables/useOrderBookResize'
import { useOrderBookScroll } from '../../composables/useOrderBookScroll'
import { useOrderBookTooltip } from '../../composables/useOrderBookTooltip'
import { useOrderBookViewport } from '../../composables/useOrderBookViewport'
import { formatPriceForDisplay } from '../../lib/formatAmount'
import type { OrderBookOrder } from '../../lib/orderBookTypes'
import { calculateAveragePrice } from '../../lib/services/priceCalculation'
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
  const { network } = useNetwork()

  const { filteredBuyOrders, filteredSellOrders, calculatePriceFn } = useOrderBookFiltering(
    orderBookData,
    contextFilters
  )

  const { sellSectionHeight, buySectionHeight, startResize } = useOrderBookResize()

  const { hoveredOrder, tooltipPosition, tooltipVisible, updateTooltipPosition, hideTooltip } =
    useOrderBookTooltip()

  // Helper function to get ticker symbol
  const getTickerSymbol = useCallback(
    (assetId: string, code?: string): string => {
      if (code) return code
      if (!assetId) return getNativeTokenTickerForNetwork(network)
      const tickerInfo = getCatTokenInfo(assetId)
      return tickerInfo?.ticker || assetId.slice(0, 8)
    },
    [getCatTokenInfo, network]
  )

  // Calculate price deviation percentage for hovered order
  const priceDeviationPercent = useOrderBookPriceDeviation({
    hoveredOrder,
    filteredBuyOrders,
    filteredSellOrders,
    contextFilters,
    getTickerSymbol,
  })

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

  // Handle scroll behavior (auto-scroll, position restoration, infinite scroll)
  useOrderBookScroll({
    sellScrollRef,
    buyScrollRef,
    filteredSellOrders,
    orderBookLoading,
    orderBookHasMore,
  })

  // Calculate average price
  const averagePrice = useMemo(() => {
    if (!contextFilters || (!contextFilters.buyAsset?.length && !contextFilters.sellAsset?.length)) {
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
  }, [contextFilters, filteredSellOrders, filteredBuyOrders, calculatePriceFn])

  const emptyMessage = useMemo(() => {
    if (
      contextFilters &&
      ((contextFilters.buyAsset && contextFilters.buyAsset.length > 0) ||
        (contextFilters.sellAsset && contextFilters.sellAsset.length > 0))
    ) {
      return 'No orders found matching your filters. Try adjusting your filters.'
    }
    return 'No orders found. Add filters to see orders.'
  }, [contextFilters])

  const handleOrderClick = (order: OrderBookOrder) => {
    onOrderClick(order)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Order Book Display */}
      <div
        className="order-book-container flex-1 flex flex-col overflow-hidden rounded-xl backdrop-blur-2xl bg-white/5 dark:bg-black/5 border border-white/15"
        style={{
          boxShadow:
            '0 0 0 1px rgba(255, 255, 255, 0.08), 0 0 30px rgba(255, 255, 255, 0.03), 0 2px 8px rgba(0, 0, 0, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Header - Fixed at top, outside scrollable sections */}
        <div>
          <OrderBookTableHeader filters={contextFilters} />
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
            filters={contextFilters}
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
            filters={contextFilters}
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
