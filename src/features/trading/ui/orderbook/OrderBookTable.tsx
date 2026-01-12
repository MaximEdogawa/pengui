'use client'

import { useThemeClasses } from '@/shared/hooks'
import { useCatTokens } from '@/shared/hooks/useTickers'
import { getNativeTokenTicker } from '@/shared/lib/config/environment'
import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  formatAmountForDisplay,
  formatAmountForTooltip,
  formatPriceForDisplay,
} from '../../lib/formatAmount'
import type { OrderBookOrder } from '../../lib/orderBookTypes'
import { calculateOrderPrice as calculateOrderPriceNumeric } from '../../lib/services/priceCalculation'

interface OrderBookTableProps {
  orders: OrderBookOrder[]
  orderType: 'buy' | 'sell'
  filters?: {
    buyAsset?: string[]
    sellAsset?: string[]
  }
  onClick: (order: OrderBookOrder) => void
  onHover: (event: React.MouseEvent, order: OrderBookOrder, orderType: 'buy' | 'sell') => void
  onMouseLeave: () => void
  detailsMap?: Map<
    string,
    {
      offerString?: string
      fullMakerAddress?: string
    }
  >
  registerElement?: (orderId: string, element: HTMLElement | null) => void
  isLoadingDetails?: boolean
  stickyHeader?: boolean
  emptyMessage?: string
  className?: string
  isLoading?: boolean
  error?: Error | null
  hasMore?: boolean
  totalOrders?: number
  justifyEnd?: boolean
  showHeader?: boolean
}

const isSingleAssetPair = (order: OrderBookOrder): boolean => {
  return order.offering.length === 1 && order.requesting.length === 1
}

export default function OrderBookTable({
  orders,
  orderType,
  filters,
  onClick,
  onHover,
  onMouseLeave,
  detailsMap,
  registerElement,
  isLoadingDetails,
  stickyHeader = true,
  emptyMessage = 'No orders available',
  className = '',
  isLoading = false,
  error = null,
  hasMore,
  totalOrders,
  justifyEnd = false,
  showHeader = true,
}: OrderBookTableProps) {
  const { t } = useThemeClasses()
  const { getCatTokenInfo } = useCatTokens()

  const getTickerSymbol = useCallback(
    (assetId: string, code?: string): string => {
      if (code) return code
      if (!assetId) return getNativeTokenTicker()
      const tickerInfo = getCatTokenInfo(assetId)
      return tickerInfo?.ticker || assetId.slice(0, 8)
    },
    [getCatTokenInfo]
  )

  const getPriceHeaderTicker = (): string => {
    if (filters?.buyAsset && filters.buyAsset.length > 0) {
      return filters.buyAsset[0]
    }
    if (filters?.sellAsset && filters.sellAsset.length > 0) {
      return filters.sellAsset[0]
    }
    return getNativeTokenTicker()
  }

  const calculateOrderPrice = useCallback(
    (order: OrderBookOrder): string => {
      if (isSingleAssetPair(order)) {
        const requestingAsset = order.requesting[0]
        const offeringAsset = order.offering[0]

        if (
          requestingAsset &&
          offeringAsset &&
          requestingAsset.amount > 0 &&
          offeringAsset.amount > 0
        ) {
          let price

          if (
            filters?.buyAsset &&
            filters.buyAsset.length > 0 &&
            filters?.sellAsset &&
            filters.sellAsset.length > 0
          ) {
            // Calculate price from buy side perspective: buyAsset/sellAsset
            // Example: buy TXCH, sell TDBX -> price = TXCH/TDBX (how much buyAsset per sellAsset)

            // Determine which asset is the buy asset and which is the sell asset
            const requestingIsBuyAsset = filters.buyAsset.some(
              (filterAsset) =>
                getTickerSymbol(requestingAsset.id, requestingAsset.code).toLowerCase() ===
                  filterAsset.toLowerCase() ||
                requestingAsset.id.toLowerCase() === filterAsset.toLowerCase() ||
                (requestingAsset.code &&
                  requestingAsset.code.toLowerCase() === filterAsset.toLowerCase())
            )

            const offeringIsBuyAsset = filters.buyAsset.some(
              (filterAsset) =>
                getTickerSymbol(offeringAsset.id, offeringAsset.code).toLowerCase() ===
                  filterAsset.toLowerCase() ||
                offeringAsset.id.toLowerCase() === filterAsset.toLowerCase() ||
                (offeringAsset.code &&
                  offeringAsset.code.toLowerCase() === filterAsset.toLowerCase())
            )

            if (requestingIsBuyAsset && !offeringIsBuyAsset) {
              price = requestingAsset.amount / offeringAsset.amount
            } else if (offeringIsBuyAsset && !requestingIsBuyAsset) {
              price = offeringAsset.amount / requestingAsset.amount
            } else {
              price = offeringAsset.amount / requestingAsset.amount
            }

            return formatPriceForDisplay(price)
          } else {
            price = offeringAsset.amount / requestingAsset.amount
            return formatPriceForDisplay(price)
          }
        }
      }

      // For multiple asset pairs, show USD total
      return `$${order.offeringUsdValue.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`
    },
    [filters, getTickerSymbol]
  )

  const textColorClass =
    orderType === 'sell' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'

  // Calculate numeric price for an order (for comparison)
  const getNumericPrice = useCallback(
    (order: OrderBookOrder): number => {
      return calculateOrderPriceNumeric(order, filters, { getTickerSymbol })
    },
    [filters, getTickerSymbol]
  )

  // Calculate best price for this side
  const bestPrice = useMemo(() => {
    // Handle edge case: empty orders array
    if (orders.length === 0) return null

    // Get all valid prices (positive and finite)
    const prices = orders
      .map(getNumericPrice)
      .filter((price) => price > 0 && isFinite(price) && !isNaN(price))

    // Handle edge case: no valid prices
    if (prices.length === 0) return null

    // Handle edge case: only one order (it's the best)
    if (prices.length === 1) return prices[0]

    if (orderType === 'sell') {
      // For sell orders, best price is the lowest (most competitive for buyers)
      const minPrice = Math.min(...prices)
      return isFinite(minPrice) && !isNaN(minPrice) ? minPrice : null
    } else {
      // For buy orders, best price is the highest (most competitive for sellers)
      const maxPrice = Math.max(...prices)
      return isFinite(maxPrice) && !isNaN(maxPrice) ? maxPrice : null
    }
  }, [orders, orderType, getNumericPrice])

  // Group orders by price and calculate count for each price level
  const priceCountMap = useMemo(() => {
    const countMap = new Map<string, number>()

    // Helper to normalize price for grouping (round to 8 decimal places to handle floating point differences)
    const normalizePrice = (price: number): string => {
      if (!isFinite(price) || isNaN(price) || price <= 0) return ''
      // Round to 8 decimal places for grouping
      return price.toFixed(8)
    }

    orders.forEach((order) => {
      const numericPrice = getNumericPrice(order)
      const normalizedPrice = normalizePrice(numericPrice)

      if (normalizedPrice) {
        const currentCount = countMap.get(normalizedPrice) || 0
        countMap.set(normalizedPrice, currentCount + 1)
      }
    })

    return countMap
  }, [orders, getNumericPrice])

  return (
    <div className={`w-full ${className}`}>
      <div className={`${justifyEnd ? 'flex flex-col justify-end min-h-full' : ''}`}>
        {isLoading && (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400 dark:text-gray-500" />
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">Loading orders...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-xs text-gray-500 dark:text-gray-400">
            Error loading orders. Please try again.
          </div>
        )}

        {!isLoading && !error && (
          <>
            {showHeader && (
              /* Header */
              <div
                className={`grid grid-cols-12 gap-2 px-2 py-1 backdrop-blur-xl ${t.card} border-b ${t.border} text-[10px] font-medium ${t.textSecondary} ${
                  stickyHeader ? 'sticky top-0 z-10' : ''
                }`}
                style={{
                  boxShadow: stickyHeader
                    ? '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)'
                    : undefined,
                }}
              >
                {/* Count */}
                <div className="col-span-1 text-left flex items-center">Count</div>

                {/* Buy */}
                <div className="col-span-3 text-right flex items-center justify-end">Buy</div>

                {/* Sell */}
                <div className="col-span-3 text-right flex items-center justify-end">Sell</div>

                {/* Price */}
                <div className="col-span-5 text-right flex items-center justify-end">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] opacity-70">({getPriceHeaderTicker()})</span>
                    <span className="font-mono">Price</span>
                  </div>
                </div>
              </div>
            )}

            {/* Rows */}
            {orders.length === 0 ? (
              <div className="px-2 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                {emptyMessage}
              </div>
            ) : (
              <div className="relative">
                {orders.map((order) => (
                  <OrderBookTableRow
                    key={order.id}
                    order={order}
                    orderType={orderType}
                    filters={filters}
                    onClick={onClick}
                    onHover={onHover}
                    onMouseLeave={onMouseLeave}
                    detailedData={detailsMap?.get(order.id)}
                    registerElement={registerElement}
                    isLoadingDetails={isLoadingDetails}
                    calculateOrderPrice={calculateOrderPrice}
                    getTickerSymbol={getTickerSymbol}
                    textColorClass={textColorClass}
                    bestPrice={bestPrice}
                    getNumericPrice={getNumericPrice}
                    priceCountMap={priceCountMap}
                  />
                ))}
              </div>
            )}

            {!hasMore && totalOrders && totalOrders > 0 && (
              <div className="text-right py-4 text-xs text-gray-400 dark:text-gray-500">
                No more orders
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

interface OrderBookTableHeaderProps {
  filters?: {
    buyAsset?: string[]
    sellAsset?: string[]
  }
}

export function OrderBookTableHeader({ filters }: OrderBookTableHeaderProps) {
  const getPriceHeaderTicker = (): string => {
    if (filters?.buyAsset && filters.buyAsset.length > 0) {
      return filters.buyAsset[0]
    }
    if (filters?.sellAsset && filters.sellAsset.length > 0) {
      return filters.sellAsset[0]
    }
    return getNativeTokenTicker()
  }

  return (
    <div className="grid grid-cols-12 gap-2 px-2 py-2 backdrop-blur-xl bg-gradient-to-b from-white/5 to-transparent dark:from-black/5 dark:to-transparent border-b border-white/10 dark:border-white/5">
      {/* Count */}
      <div className="col-span-1 text-left flex items-center font-medium text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Count
      </div>

      {/* Buy */}
      <div className="col-span-3 text-right flex items-center justify-end font-medium text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 pr-[17px]">
        Buy
      </div>

      {/* Sell */}
      <div className="col-span-3 text-right flex items-center justify-end font-medium text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 pr-[17px]">
        Sell
      </div>

      {/* Price */}
      <div className="col-span-5 text-right flex items-center justify-end pr-[17px]">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] opacity-40 font-normal text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            ({getPriceHeaderTicker()})
          </span>
          <span className="font-medium text-[10px] uppercase tracking-wider text-gray-600 dark:text-gray-300">
            Price
          </span>
        </div>
      </div>
    </div>
  )
}

interface OrderBookTableRowProps {
  order: OrderBookOrder
  orderType: 'buy' | 'sell'
  filters?: {
    buyAsset?: string[]
    sellAsset?: string[]
  }
  onClick: (order: OrderBookOrder) => void
  onHover: (event: React.MouseEvent, order: OrderBookOrder, orderType: 'buy' | 'sell') => void
  onMouseLeave: () => void
  detailedData?: {
    offerString?: string
    fullMakerAddress?: string
  }
  registerElement?: (orderId: string, element: HTMLElement | null) => void
  isLoadingDetails?: boolean
  calculateOrderPrice: (order: OrderBookOrder) => string
  getTickerSymbol: (assetId: string, code?: string) => string
  textColorClass: string
  bestPrice: number | null
  getNumericPrice: (order: OrderBookOrder) => number
  priceCountMap: Map<string, number>
}

function OrderBookTableRow({
  order,
  orderType,
  filters,
  onClick,
  onHover,
  onMouseLeave,
  detailedData,
  registerElement,
  isLoadingDetails,
  calculateOrderPrice,
  getTickerSymbol,
  textColorClass,
  bestPrice,
  getNumericPrice,
  priceCountMap,
}: OrderBookTableRowProps) {
  // Calculate price deviation percentage from best price
  const priceDeviationPercent = useMemo(() => {
    // Handle edge cases: no best price, invalid prices
    if (!bestPrice || bestPrice <= 0 || !isFinite(bestPrice)) return 0

    const currentPrice = getNumericPrice(order)

    // Handle edge cases: invalid current price
    if (!currentPrice || currentPrice <= 0 || !isFinite(currentPrice)) return 0

    // If prices are exactly equal, return 0% deviation
    if (currentPrice === bestPrice) return 0

    let deviation: number

    if (orderType === 'sell') {
      // For sell orders: ((currentPrice - bestPrice) / bestPrice) * 100
      // Best price is lowest, so higher prices have higher deviation
      deviation = ((currentPrice - bestPrice) / bestPrice) * 100
    } else {
      // For buy orders: ((bestPrice - currentPrice) / bestPrice) * 100
      // Best price is highest, so lower prices have higher deviation
      deviation = ((bestPrice - currentPrice) / bestPrice) * 100
    }

    // Handle NaN or Infinity results
    if (!isFinite(deviation) || isNaN(deviation)) return 0

    // Cap at 100% and ensure non-negative
    return Math.max(0, Math.min(100, deviation))
  }, [order, bestPrice, orderType, getNumericPrice])

  // Register element for viewport detection
  const rowRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (registerElement && rowRef.current) {
      registerElement(order.id, rowRef.current)
    }
    return () => {
      if (registerElement) {
        registerElement(order.id, null)
      }
    }
  }, [order.id, registerElement])

  // Calculate background width based on price deviation (0% = no background, 100% = full width)
  // This uses the same approach as the previous depthWidth but with price-based calculation
  const backgroundWidth = useMemo(() => {
    // Ensure width is between 0% and 100%
    return `${Math.max(0, Math.min(100, priceDeviationPercent))}%`
  }, [priceDeviationPercent])

  // Background color classes - red for sell, green for buy
  const bgColorClass =
    orderType === 'sell'
      ? 'bg-red-500/8 dark:bg-red-500/15 backdrop-blur-sm group-hover:bg-red-500/12 dark:group-hover:bg-red-500/20'
      : 'bg-green-500/8 dark:bg-green-500/15 backdrop-blur-sm group-hover:bg-green-500/12 dark:group-hover:bg-green-500/20'

  return (
    <div
      ref={rowRef}
      className="w-full group relative mb-0.5 cursor-pointer transition-all duration-200"
      onClick={() => onClick(order)}
      onMouseMove={(e) => onHover(e, order, orderType)}
      onMouseLeave={onMouseLeave}
    >
      {/* Dynamic background based on price deviation - width scales from 0% to 100%, fills from right to left */}
      <div
        className={`absolute ${bgColorClass} transition-all duration-300`}
        style={{
          width: backgroundWidth,
          right: 0,
          top: 0,
          bottom: 0,
        }}
      />

      <div className="relative grid grid-cols-12 gap-2 px-2 py-1.5 items-center">
        {/* Count - smallest, left aligned */}
        <div className="col-span-1 text-left text-gray-600 dark:text-gray-400 font-mono text-[10px]">
          {(() => {
            const numericPrice = getNumericPrice(order)
            // Normalize price for lookup (round to 8 decimal places)
            const normalizedPrice =
              isFinite(numericPrice) && !isNaN(numericPrice) && numericPrice > 0
                ? numericPrice.toFixed(8)
                : ''
            const count = normalizedPrice ? priceCountMap.get(normalizedPrice) || 1 : 1
            return count
          })()}
        </div>

        {/* Buy */}
        <div className="col-span-3 text-right flex items-center justify-end">
          <div className="flex flex-col gap-0.5">
            {order.offering.map((item, idx) => (
              <div
                key={idx}
                className={`${textColorClass} font-mono text-[10px] flex items-center justify-end gap-1`}
                title={`${formatAmountForTooltip(item.amount || 0)} ${item.code || getTickerSymbol(item.id)}`}
              >
                <span className="text-right tabular-nums">
                  {formatAmountForDisplay(item.amount || 0)}
                </span>
                <span className="flex-shrink-0">{item.code || getTickerSymbol(item.id)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sell */}
        <div className="col-span-3 text-right flex items-center justify-end">
          <div className="flex flex-col gap-0.5">
            {order.requesting.map((item, idx) => (
              <div
                key={idx}
                className="text-[10px] font-mono text-gray-600 dark:text-gray-300 flex items-center justify-end gap-1"
                title={`${formatAmountForTooltip(item.amount || 0)} ${item.code || getTickerSymbol(item.id)}`}
              >
                <span className="text-right tabular-nums">
                  {formatAmountForDisplay(item.amount || 0)}
                </span>
                <span className="flex-shrink-0">{item.code || getTickerSymbol(item.id)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Price - biggest, right aligned */}
        <div className="col-span-5 text-right text-gray-700 dark:text-gray-300 font-mono text-[10px]">
          <div className="flex items-center justify-end">
            {isLoadingDetails && !detailedData && (
              <Loader2 className="w-3 h-3 animate-spin text-gray-400 mr-1" />
            )}
            <span className="tabular-nums" title={calculateOrderPrice(order)}>
              {calculateOrderPrice(order)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
