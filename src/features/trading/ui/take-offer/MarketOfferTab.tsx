'use client'

import type { OfferAsset, OfferDetails } from '@/entities/offer'
import { convertOfferStateToStatus } from '@/entities/offer'
import { useDexieDataService } from '@/features/offers/api/useDexieDataService'
import type { DexieOffer, DexiePostOfferResponse } from '@/features/offers/lib/dexieTypes'
import { calculateOfferState } from '@/features/offers/lib/dexieUtils'
import { useOfferInspection } from '@/features/offers/model/useOfferInspection'
import { useTakeOffer } from '@/features/wallet'
import { useCatTokens, useThemeClasses } from '@/shared/hooks'
import { getNativeTokenTicker } from '@/shared/lib/config/environment'
import { logger } from '@/shared/lib/logger'
import {
  assetInputAmounts,
  formatAssetAmount,
  formatAssetAmountForInput,
  formatXchAmount,
  getAmountPlaceholder,
  getMinimumFeeInXch,
} from '@/shared/lib/utils/chia-units'
import { getDexieStatusDescription, validateOfferString } from '@/shared/lib/utils/offerUtils'
import Button from '@/shared/ui/Button'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, ShoppingCart } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOrderBookFiltering } from '../../composables/useOrderBookFiltering'
import { formatPriceForDisplay } from '../../lib/formatAmount'
import { calculateOrderPrice as calculateOrderPriceNumeric } from '../../lib/services/priceCalculation'
import type { OrderBookFilters, OrderBookOrder } from '../../lib/orderBookTypes'
import { useOrderBookFilters } from '../../model/OrderBookFiltersProvider'
import { useOrderBook } from '../../model/useOrderBook'
import OrderDetailsSection from './OrderDetailsSection'

interface MarketOfferTabProps {
  order?: OrderBookOrder
  onOfferTaken?: (offer: OfferDetails) => void
  onClose?: () => void // Only used in modal mode
  mode?: 'modal' | 'inline' // Determines styling and layout
  filters?: OrderBookFilters
}

/**
 * Convert Dexie offer to app offer format
 */
function convertDexieOfferToAppOffer(dexieResponse: DexiePostOfferResponse): {
  assetsOffered: OfferAsset[]
  assetsRequested: OfferAsset[]
  creatorAddress?: string
  fee: number
  status: string
  dexieStatus: string
} {
  if (!dexieResponse.offer) {
    return {
      assetsOffered: [],
      assetsRequested: [],
      fee: 0,
      status: 'unknown',
      dexieStatus: 'Unknown',
    }
  }

  const offer = dexieResponse.offer
  const calculatedState = calculateOfferState(offer)

  // Convert Dexie assets to app assets
  const assetsOffered: OfferAsset[] = (offer.offered || []).map((asset) => {
    const isXch = !asset.id || asset.id === 'XCH'
    return {
      amount: asset.amount,
      assetId: isXch ? '' : asset.id,
      type: (isXch ? 'xch' : 'cat') as 'xch' | 'cat',
      symbol: asset.code || undefined,
    }
  })

  const assetsRequested: OfferAsset[] = (offer.requested || []).map((asset) => {
    const isXch = !asset.id || asset.id === 'XCH'
    return {
      amount: asset.amount,
      assetId: isXch ? '' : asset.id,
      type: (isXch ? 'xch' : 'cat') as 'xch' | 'cat',
      symbol: asset.code || undefined,
    }
  })

  return {
    assetsOffered,
    assetsRequested,
    creatorAddress: undefined,
    fee: offer.fees ? offer.fees / 1_000_000_000_000 : 0,
    status: convertOfferStateToStatus(calculatedState),
    dexieStatus: calculatedState,
  }
}

export default function MarketOfferTab({
  order,
  onOfferTaken,
  onClose,
  mode = 'inline',
  filters,
}: MarketOfferTabProps) {
  const { t } = useThemeClasses()
  const { postOffer, isPosting } = useOfferInspection()
  const takeOfferMutation = useTakeOffer()
  const { getCatTokenInfo } = useCatTokens()
  const dexieDataService = useDexieDataService()
  const queryClient = useQueryClient()

  // Get order book data for price deviation calculation
  const { filters: contextFilters } = useOrderBookFilters()
  const { orderBookData } = useOrderBook(contextFilters)
  const { filteredBuyOrders, filteredSellOrders } = useOrderBookFiltering(orderBookData, filters)

  // Determine if order is buy or sell (from taker's perspective)
  const orderType = useMemo(() => {
    if (!order || !filters?.buyAsset || !filters?.sellAsset) {
      return null
    }

    const buyAssets = filters.buyAsset || []
    const sellAssets = filters.sellAsset || []

    if (buyAssets.length === 0 || sellAssets.length === 0) {
      return null
    }

    // Helper to get ticker symbol
    const getTickerSymbol = (assetId: string, code?: string): string => {
      if (code) return code
      if (!assetId) return getNativeTokenTicker()
      const tickerInfo = getCatTokenInfo(assetId)
      return tickerInfo?.ticker || assetId.slice(0, 8)
    }

    // Check if requesting side matches buy asset
    const requestingIsBuyAsset = order.requesting.some((asset) =>
      buyAssets.some(
        (filterAsset) =>
          getTickerSymbol(asset.id, asset.code).toLowerCase() === filterAsset.toLowerCase() ||
          asset.id.toLowerCase() === filterAsset.toLowerCase() ||
          (asset.code && asset.code.toLowerCase() === filterAsset.toLowerCase())
      )
    )

    // Check if offering side matches buy asset
    const offeringIsBuyAsset = order.offering.some((asset) =>
      buyAssets.some(
        (filterAsset) =>
          getTickerSymbol(asset.id, asset.code).toLowerCase() === filterAsset.toLowerCase() ||
          asset.id.toLowerCase() === filterAsset.toLowerCase() ||
          (asset.code && asset.code.toLowerCase() === filterAsset.toLowerCase())
      )
    )

    // From taker's perspective (Market tab):
    // If maker is requesting buyAsset (offering sellAsset), taker is SELLING buyAsset
    // If maker is offering buyAsset (requesting sellAsset), taker is BUYING buyAsset
    if (requestingIsBuyAsset && !offeringIsBuyAsset) {
      return 'sell' // Maker wants buyAsset, so taker is selling it
    } else if (offeringIsBuyAsset && !requestingIsBuyAsset) {
      return 'buy' // Maker is giving buyAsset, so taker is buying it
    }

    return null
  }, [
    order?.id,
    order?.requesting,
    order?.offering,
    filters?.buyAsset,
    filters?.sellAsset,
    getCatTokenInfo,
  ])

  // Helper function to get ticker symbol (reused from orderType calculation)
  const getTickerSymbolForPrice = useCallback(
    (assetId: string, code?: string): string => {
      if (code) return code
      if (!assetId) return getNativeTokenTicker()
      const tickerInfo = getCatTokenInfo(assetId)
      return tickerInfo?.ticker || assetId.slice(0, 8)
    },
    [getCatTokenInfo]
  )

  // Calculate price deviation percentage for the order
  const priceDeviationPercent = useMemo(() => {
    if (!order) return null

    // Determine which order list the order belongs to
    const isBuyOrder = filteredBuyOrders.some((o) => o.id === order.id)
    const orderList = isBuyOrder ? filteredBuyOrders : filteredSellOrders
    const orderTypeForPrice = isBuyOrder ? 'buy' : 'sell'

    if (orderList.length === 0) return null

    // Calculate numeric price for all orders
    const getNumericPrice = (o: OrderBookOrder) => {
      return calculateOrderPriceNumeric(o, filters, { getTickerSymbol: getTickerSymbolForPrice })
    }

    // Calculate best price (lowest for sell, highest for buy)
    const prices = orderList.map(getNumericPrice).filter((p) => p > 0 && isFinite(p))
    if (prices.length === 0) return null

    const bestPrice =
      orderTypeForPrice === 'sell'
        ? Math.min(...prices) // Lowest price is best for sell
        : Math.max(...prices) // Highest price is best for buy

    if (!bestPrice || bestPrice <= 0 || !isFinite(bestPrice)) return null

    // Calculate current price of the order
    const currentPrice = getNumericPrice(order)
    if (!currentPrice || currentPrice <= 0 || !isFinite(currentPrice)) return null

    // If prices are exactly equal, return 0% deviation
    if (currentPrice === bestPrice) return 0

    // Calculate deviation percentage
    let deviation: number
    if (orderTypeForPrice === 'sell') {
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
  }, [order, filteredBuyOrders, filteredSellOrders, filters, getTickerSymbolForPrice])

  // Calculate order price for display
  const orderPrice = useMemo(() => {
    if (!order || !filters) return null
    const numericPrice = calculateOrderPriceNumeric(order, filters, {
      getTickerSymbol: getTickerSymbolForPrice,
    })
    if (!isFinite(numericPrice) || numericPrice <= 0) return null
    return numericPrice
  }, [order, filters, getTickerSymbolForPrice])

  // Get price header ticker
  const getPriceHeaderTicker = useCallback((): string => {
    if (filters?.buyAsset && filters.buyAsset.length > 0) {
      return filters.buyAsset[0]
    }
    if (filters?.sellAsset && filters.sellAsset.length > 0) {
      return filters.sellAsset[0]
    }
    return getNativeTokenTicker()
  }, [filters])

  // Form state
  const [offerString, setOfferString] = useState('')
  const [fee, setFee] = useState(getMinimumFeeInXch())
  const [feeInput, setFeeInput] = useState<string | undefined>(undefined)

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [parseError, setParseError] = useState('')
  const [offerPreview, setOfferPreview] = useState<{
    assetsOffered?: OfferAsset[]
    assetsRequested?: OfferAsset[]
    creatorAddress?: string
    fee?: number
    status?: string
    dexieStatus?: string
  } | null>(null)
  // Refs to prevent infinite loops
  const isParsingRef = useRef(false)
  const lastParsedOfferRef = useRef<string>('')
  const postOfferRef = useRef(postOffer)
  const getCatTokenInfoRef = useRef(getCatTokenInfo)

  // Update refs when functions change
  useEffect(() => {
    postOfferRef.current = postOffer
    getCatTokenInfoRef.current = getCatTokenInfo
  }, [postOffer, getCatTokenInfo])

  // Get cached data immediately for instant UI updates
  const cachedOrderData = useMemo(() => {
    if (!order?.id) return null
    const cached = queryClient.getQueryData<{
      orderId: string
      offerString: string
      fullMakerAddress: string
      offer: DexieOffer
    }>(['orderBookDetails', order.id])

    if (cached) {
      return {
        offerString: cached.offerString,
        fullMakerAddress: cached.fullMakerAddress,
        offer: cached.offer,
      }
    }
    return null
  }, [order?.id, queryClient])

  // Pre-populate offer preview from cached data immediately (no debounce, no delay)
  useEffect(() => {
    const populateFromCache = async () => {
      if (!cachedOrderData?.offer || !order?.id) return

      // Skip if we already have preview for this order
      if (lastParsedOfferRef.current === cachedOrderData.offerString) {
        return
      }

      // Mark as parsing to prevent duplicate processing
      if (isParsingRef.current) return
      isParsingRef.current = true

      try {
        const appOffer = convertDexieOfferToAppOffer({
          success: true,
          id: cachedOrderData.offer.id || '',
          known: true,
          offer: cachedOrderData.offer,
        })

        // Enrich assets with ticker symbols
        const enrichedAssetsOffered = await Promise.all(
          appOffer.assetsOffered.map(async (asset) => {
            if (asset.assetId) {
              const tickerInfo = await getCatTokenInfoRef.current(asset.assetId)
              return {
                ...asset,
                symbol: tickerInfo?.ticker || undefined,
              }
            }
            return asset
          })
        )

        const enrichedAssetsRequested = await Promise.all(
          appOffer.assetsRequested.map(async (asset) => {
            if (asset.assetId) {
              const tickerInfo = await getCatTokenInfoRef.current(asset.assetId)
              return {
                ...asset,
                symbol: tickerInfo?.ticker || undefined,
              }
            }
            return asset
          })
        )

        setOfferPreview({
          assetsOffered: enrichedAssetsOffered,
          assetsRequested: enrichedAssetsRequested,
          creatorAddress: appOffer.creatorAddress,
          fee: appOffer.fee,
          status: appOffer.status,
          dexieStatus: appOffer.dexieStatus,
        })
        lastParsedOfferRef.current = cachedOrderData.offerString
        setParseError('')
      } catch (error) {
        logger.error('Error processing cached offer data:', error)
      } finally {
        isParsingRef.current = false
      }
    }

    // Populate immediately from cache (no debounce, no delay)
    populateFromCache()
  }, [cachedOrderData?.offer, cachedOrderData?.offerString, order?.id])

  // Use TanStack Query to fetch offer details - shares cache with useOrderBookDetails
  // Uses individual query key: ['orderBookDetails', orderId]
  // This makes loading instant if the order was already fetched for the viewport
  // TanStack Query automatically deduplicates - same order requested multiple times only fetches once
  const offerDetailsQuery = useQuery<{
    offerString: string
    fullMakerAddress: string
    offer: DexieOffer
  } | null>({
    queryKey: ['orderBookDetails', order?.id], // Individual key per order - same structure as useOrderBookDetails
    queryFn: async () => {
      if (!order?.id) return null
      const response = await dexieDataService.inspectOffer(order.id)
      if (response.success && response.offer) {
        return {
          offerString: response.offer.offer || '',
          fullMakerAddress: response.offer.id || '',
          offer: response.offer,
        }
      }
      throw new Error(response?.error_message || 'Failed to fetch offer details')
    },
    enabled: !!order?.id, // Only fetch if order is provided
    staleTime: 5 * 60 * 1000, // 5 minutes - same as useOrderBookDetails
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 1000,
    // Use initialData for instant display when cached data exists
    initialData: cachedOrderData || undefined,
    // Use placeholderData as fallback for smooth transitions
    placeholderData: (previousData) => {
      if (cachedOrderData) return cachedOrderData
      return previousData
    },
    // Don't refetch if we have fresh cached data - prevents unnecessary requests
    refetchOnMount: !cachedOrderData, // Only refetch on mount if no cached data
    refetchOnWindowFocus: false, // Never refetch on window focus
    refetchOnReconnect: false, // Never refetch on reconnect
  })

  // Extract offer string from query result - prefer cached data for instant display
  const fetchedOfferString =
    offerDetailsQuery.data?.offerString || cachedOrderData?.offerString || ''
  // Only show loading if we don't have any data (neither cached nor fetched)
  const isLoadingOfferString =
    offerDetailsQuery.isLoading && !offerDetailsQuery.data && !cachedOrderData

  // Update offer string when query data changes
  useEffect(() => {
    // Clear error message when order changes (clicking on another offer)
    setErrorMessage('')
    setSuccessMessage('')

    if (fetchedOfferString) {
      setOfferString(fetchedOfferString)
    } else if (!order?.id) {
      // Reset if no order
      setOfferString('')
      setOfferPreview(null)
      setParseError('')
      lastParsedOfferRef.current = ''
    }
  }, [fetchedOfferString, order?.id])

  // Handle query errors
  useEffect(() => {
    if (offerDetailsQuery.isError && order?.id) {
      const errorMsg =
        offerDetailsQuery.error instanceof Error
          ? offerDetailsQuery.error.message
          : 'Failed to fetch offer details'
      setErrorMessage(errorMsg)
      logger.error('Error fetching offer details:', offerDetailsQuery.error)
    }
  }, [offerDetailsQuery.isError, offerDetailsQuery.error, order?.id])

  // Parse offer when string changes or when we have offer data from query
  useEffect(() => {
    const parseOffer = async () => {
      // Use offer data from query if available, otherwise use offerString state
      const offerData = offerDetailsQuery.data?.offer
      const trimmedOffer = offerString.trim()

      // Skip if empty, already parsing, or same as last parsed
      // Don't skip if loading - we can use cached data
      if (!trimmedOffer || isParsingRef.current || lastParsedOfferRef.current === trimmedOffer) {
        return
      }

      // If we have offer data from query, use it directly instead of parsing
      // This is much faster as we skip the POST request to inspect the offer
      if (offerData) {
        isParsingRef.current = true
        lastParsedOfferRef.current = trimmedOffer
        setParseError('')
        // Don't clear preview - keep existing preview visible while updating

        try {
          const appOffer = convertDexieOfferToAppOffer({
            success: true,
            id: offerData.id || '',
            known: true,
            offer: offerData,
          })

          // Enrich assets with ticker symbols
          const enrichedAssetsOffered = await Promise.all(
            appOffer.assetsOffered.map(async (asset) => {
              if (asset.assetId) {
                const tickerInfo = await getCatTokenInfoRef.current(asset.assetId)
                return {
                  ...asset,
                  symbol: tickerInfo?.ticker || undefined,
                }
              }
              return asset
            })
          )

          const enrichedAssetsRequested = await Promise.all(
            appOffer.assetsRequested.map(async (asset) => {
              if (asset.assetId) {
                const tickerInfo = await getCatTokenInfoRef.current(asset.assetId)
                return {
                  ...asset,
                  symbol: tickerInfo?.ticker || undefined,
                }
              }
              return asset
            })
          )

          setOfferPreview({
            assetsOffered: enrichedAssetsOffered,
            assetsRequested: enrichedAssetsRequested,
            creatorAddress: appOffer.creatorAddress,
            fee: appOffer.fee,
            status: appOffer.status,
            dexieStatus: appOffer.dexieStatus,
          })
          setParseError('')
        } catch (error) {
          logger.error('Error processing offer data:', error)
          setParseError('Error processing offer data')
          setOfferPreview(null)
          lastParsedOfferRef.current = ''
        } finally {
          isParsingRef.current = false
        }
        return
      }

      if (!validateOfferString(trimmedOffer)) {
        setParseError('Invalid offer string format')
        setOfferPreview(null)
        return
      }

      // Mark as parsing and update last parsed
      isParsingRef.current = true
      lastParsedOfferRef.current = trimmedOffer
      setParseError('')
      // Don't clear preview - keep existing preview visible while fetching

      // Use Dexie to inspect the offer and get real asset details
      try {
        const postResponse = await postOfferRef.current({
          offer: trimmedOffer,
          drop_only: false,
          claim_rewards: false,
        })

        if (postResponse && postResponse.success && postResponse.offer) {
          // The POST response contains the full offer data - use it directly
          const appOffer = convertDexieOfferToAppOffer(postResponse)

          // Enrich assets with ticker symbols
          const enrichedAssetsOffered = await Promise.all(
            appOffer.assetsOffered.map(async (asset) => {
              if (asset.assetId) {
                const tickerInfo = await getCatTokenInfoRef.current(asset.assetId)
                return {
                  ...asset,
                  symbol: tickerInfo?.ticker || undefined,
                }
              }
              return asset
            })
          )

          const enrichedAssetsRequested = await Promise.all(
            appOffer.assetsRequested.map(async (asset) => {
              if (asset.assetId) {
                const tickerInfo = await getCatTokenInfoRef.current(asset.assetId)
                return {
                  ...asset,
                  symbol: tickerInfo?.ticker || undefined,
                }
              }
              return asset
            })
          )

          setOfferPreview({
            assetsOffered: enrichedAssetsOffered,
            assetsRequested: enrichedAssetsRequested,
            creatorAddress: appOffer.creatorAddress,
            fee: appOffer.fee,
            status: appOffer.status,
            dexieStatus: appOffer.dexieStatus,
          })
          setParseError('')
        } else if (postResponse && postResponse.success && postResponse.id) {
          // Handle case where POST only returns ID (older API behavior)
          setParseError('Offer string validated - details will be confirmed by wallet')
          setOfferPreview({
            assetsOffered: [],
            assetsRequested: [],
            creatorAddress: undefined,
            fee: undefined,
          })
        }
      } catch {
        setParseError('Error inspecting offer on Dexie marketplace')
        setOfferPreview(null)
        // Reset last parsed on error so we can retry
        lastParsedOfferRef.current = ''
      } finally {
        isParsingRef.current = false
      }
    }

    // Only parse if we don't already have preview from cache
    // If cached data was used, skip this parse to avoid duplicate work
    if (cachedOrderData?.offer && lastParsedOfferRef.current === cachedOrderData.offerString) {
      // Already processed from cache, skip
      return
    }

    // Debounce parsing to avoid too many requests
    // Reduced from 500ms to 200ms for faster updates
    const timeoutId = setTimeout(() => {
      parseOffer()
    }, 200)

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      // Reset parsing flag if component unmounts or effect re-runs
      isParsingRef.current = false
    }
  }, [
    offerString,
    order?.id,
    fetchedOfferString,
    offerDetailsQuery.data?.offer,
    cachedOrderData?.offer,
  ]) // Depend on offerString, order ID, fetched offer string, and query data

  // Handle fee input with standardized validation (XCH allows floats)
  const handleFeeChange = useCallback((value: string) => {
    if (assetInputAmounts.isValid(value, 'xch')) {
      setFeeInput(value)
      // Safely convert to number
      const parsed = assetInputAmounts.parse(value, 'xch')
      setFee(parsed)
    }
  }, [])

  const isFormValid =
    offerString.trim().length > 0 && fee >= 0 && (!parseError || parseError.includes('validated'))

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setErrorMessage('')
      setSuccessMessage('')

      if (!isFormValid) {
        setErrorMessage('Please enter a valid offer string and fee')
        return
      }

      setIsSubmitting(true)

      try {
        const result = await takeOfferMutation.mutateAsync({
          offer: offerString.trim(),
          fee: fee,
        })

        if (result && result.success && result.tradeId) {
          const takenOffer: OfferDetails = {
            id: Date.now().toString(),
            tradeId: result.tradeId,
            offerString: offerString.trim(),
            status: 'pending',
            createdAt: new Date(),
            assetsOffered: offerPreview?.assetsOffered || [],
            assetsRequested: offerPreview?.assetsRequested || [],
            fee: offerPreview?.fee || fee,
            creatorAddress: offerPreview?.creatorAddress || 'unknown',
          }

          setSuccessMessage('Offer taken successfully!')
          onOfferTaken?.(takenOffer)

          // Reset form after a short delay
          setTimeout(() => {
            setOfferString('')
            setFee(getMinimumFeeInXch())
            setFeeInput(undefined)
            setOfferPreview(null)
            setSuccessMessage('')
            if (mode === 'modal' && onClose) {
              onClose()
            }
          }, 1500)
        } else {
          throw new Error('Failed to take market offer')
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred'
        setErrorMessage(`Failed to take market offer: ${errorMsg}`)
      } finally {
        setIsSubmitting(false)
      }
    },
    [offerString, fee, isFormValid, takeOfferMutation, offerPreview, onOfferTaken, onClose, mode]
  )

  const getTickerSymbol = useCallback(
    (assetId: string | undefined, symbol?: string) => {
      if (symbol) return symbol
      if (!assetId) return 'XCH'
      const tickerInfo = getCatTokenInfo(assetId)
      return tickerInfo?.ticker || assetId.slice(0, 8)
    },
    [getCatTokenInfo]
  )

  const [isOrderDetailsExpanded, setIsOrderDetailsExpanded] = useState(false)
  const containerClass = mode === 'modal' ? 'space-y-4' : 'space-y-3'

  // Reset offer details expanded state when order changes
  useEffect(() => {
    setIsOrderDetailsExpanded(false)
  }, [order?.id])

  return (
    <div className={containerClass}>
      {/* Form */}
      <form onSubmit={handleSubmit} className={containerClass}>
        {/* Offer String Input - Show when no order is provided */}
        {!order && (
          <div>
            <label className={`block text-xs font-medium ${t.text} mb-1.5`}>Offer String</label>
            <textarea
              value={offerString}
              onChange={(e) => setOfferString(e.target.value)}
              placeholder="Paste offer string here..."
              rows={6}
              className={`w-full px-2 py-1.5 border rounded-lg text-xs ${t.input} ${t.border} backdrop-blur-xl font-mono`}
              disabled={isSubmitting}
            />
            <p className={`mt-1 text-xs ${t.textSecondary}`}>
              Paste an offer string to take an offer from the marketplace.
            </p>
          </div>
        )}

        {/* Offer Preview - Moved to top */}
        {offerPreview && (
          <div className={`p-3 rounded-lg ${t.cardHover} backdrop-blur-xl border ${t.border}`}>
            <h4 className={`text-xs font-medium ${t.text} mb-2`}>Offer Preview</h4>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className={t.textSecondary}>You will receive:</span>
                <span className={t.text}>
                  {offerPreview.assetsOffered && offerPreview.assetsOffered.length > 0
                    ? offerPreview.assetsOffered
                        .map(
                          (a) =>
                            `${formatAssetAmount(a.amount, a.type)} ${getTickerSymbol(a.assetId, a.symbol)}`
                        )
                        .join(', ')
                    : 'Assets from offer'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={t.textSecondary}>You will pay:</span>
                <span className={t.text}>
                  {offerPreview.assetsRequested && offerPreview.assetsRequested.length > 0
                    ? offerPreview.assetsRequested
                        .map(
                          (a) =>
                            `${formatAssetAmount(a.amount, a.type)} ${getTickerSymbol(a.assetId, a.symbol)}`
                        )
                        .join(', ')
                    : 'Assets to offer creator'}
                </span>
              </div>
              {orderPrice !== null && (
                <div className={`flex justify-between border-t ${t.border} pt-1.5 mt-1.5`}>
                  <span className={`text-xs ${t.textSecondary}`}>Price:</span>
                  <span className={`text-xs font-mono ${t.text}`}>
                    {formatPriceForDisplay(orderPrice)} {getPriceHeaderTicker()}
                  </span>
                </div>
              )}
              {priceDeviationPercent !== null && priceDeviationPercent !== undefined && (
                <div className={`flex justify-between border-t ${t.border} pt-1.5 mt-1.5`}>
                  <span className={`text-xs ${t.textSecondary}`}>Price Range:</span>
                  <span
                    className={`text-xs font-mono ${t.text} cursor-help`}
                    title={`${priceDeviationPercent.toFixed(10)}%`}
                  >
                    {priceDeviationPercent < 0.01
                      ? (() => {
                          // Show full precision up to 10 decimal places, remove trailing zeros
                          const formatted = priceDeviationPercent.toFixed(10)
                          // Remove trailing zeros after decimal point, but keep at least .0
                          const trimmed = formatted.replace(/0+$/, '')
                          return `${trimmed.endsWith('.') ? `${trimmed}0` : trimmed}%`
                        })()
                      : `${priceDeviationPercent.toFixed(2)}%`}
                  </span>
                </div>
              )}
              <div className={`flex justify-between border-t ${t.border} pt-1.5 mt-1.5`}>
                <span className={`font-medium ${t.text}`}>Fee:</span>
                <span className={`font-medium ${t.text}`}>
                  {formatXchAmount(offerPreview.fee !== undefined ? offerPreview.fee : fee)} XCH
                </span>
              </div>
              {offerPreview.dexieStatus && (
                <div className={`flex justify-between border-t ${t.border} pt-1.5 mt-1.5`}>
                  <span className={`font-medium ${t.text}`}>Status:</span>
                  <span className={`font-medium ${t.text}`}>
                    {getDexieStatusDescription(offerPreview.dexieStatus)}
                  </span>
                </div>
              )}
              {offerPreview.creatorAddress && (
                <div className={`flex justify-between border-t ${t.border} pt-1.5 mt-1.5`}>
                  <span className={`font-medium ${t.text}`}>Creator:</span>
                  <span className={`font-medium ${t.text} text-xs font-mono`}>
                    {offerPreview.creatorAddress.slice(0, 8)}...
                    {offerPreview.creatorAddress.slice(-8)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Transaction Fee - Moved to top */}
        <div>
          <label className={`block text-xs font-medium ${t.text} mb-1.5`}>
            Transaction Fee (XCH)
          </label>
          <input
            type="text"
            inputMode="decimal"
            pattern="[0-9]*\.?[0-9]*"
            value={
              feeInput !== undefined
                ? feeInput
                : fee && fee > 0
                  ? formatAssetAmountForInput(fee, 'xch')
                  : ''
            }
            onChange={(e) => handleFeeChange(e.target.value)}
            onBlur={() => {
              // Safely convert to number
              const parsed = assetInputAmounts.parse(
                feeInput !== undefined ? feeInput : fee?.toString() || '',
                'xch'
              )
              setFee(parsed >= 0 ? parsed : getMinimumFeeInXch())
              setFeeInput(undefined)
            }}
            placeholder={getAmountPlaceholder('xch')}
            className={`w-full px-2 py-1.5 border rounded-lg text-xs ${t.input} ${t.border} backdrop-blur-xl`}
            disabled={isSubmitting}
          />
          <p className={`mt-1 text-xs ${t.textSecondary}`}>
            Fee can be 0 for free transactions (minimum: {formatXchAmount(getMinimumFeeInXch())}{' '}
            XCH)
          </p>
        </div>

        {/* Market Offer Button - Moved to top */}
        <div className="flex flex-wrap justify-end gap-2">
          {mode === 'modal' && onClose && (
            <Button type="button" onClick={onClose} variant="secondary" disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            variant={orderType === 'sell' ? 'danger' : 'success'}
            icon={isSubmitting ? undefined : ShoppingCart}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Taking...
              </>
            ) : (
              'Take Offer'
            )}
          </Button>
        </div>

        {/* Loading indicator when fetching offer details */}
        {isLoadingOfferString && (
          <div className="flex items-center justify-center py-4">
            <Loader2 size={16} className="animate-spin text-blue-600 dark:text-blue-400 mr-2" />
            <span className={`text-xs ${t.textSecondary}`}>Loading offer details...</span>
          </div>
        )}

        {/* Parse error display */}
        {parseError && (
          <div
            className={`p-2 rounded-lg border ${t.border} backdrop-blur-xl ${
              parseError.includes('validated')
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}
          >
            <p
              className={`text-xs ${
                parseError.includes('validated')
                  ? 'text-blue-700 dark:text-blue-300'
                  : 'text-red-700 dark:text-red-300'
              }`}
            >
              {parseError}
            </p>
          </div>
        )}

        {/* Processing indicator */}
        {isPosting && (
          <div className="flex items-center py-2">
            <Loader2 size={12} className="animate-spin text-blue-600 dark:text-blue-400 mr-2" />
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Processing offer with Dexie marketplace...
            </p>
          </div>
        )}

        {/* Error/Success Messages */}
        {errorMessage && (
          <div
            className={`p-2 rounded-lg border ${t.border} backdrop-blur-xl bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800`}
          >
            <p className="text-xs text-red-700 dark:text-red-300">{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div
            className={`p-2 rounded-lg border ${t.border} backdrop-blur-xl bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800`}
          >
            <p className="text-xs text-green-700 dark:text-green-300">{successMessage}</p>
          </div>
        )}
      </form>

      {/* Offer Details Section - Collapsible, only show if order is provided */}
      {order && (
        <div
          className={`rounded-lg ${t.cardHover} backdrop-blur-xl border ${t.border} overflow-hidden`}
        >
          <button
            type="button"
            onClick={() => setIsOrderDetailsExpanded(!isOrderDetailsExpanded)}
            className={`w-full p-3 flex items-center justify-between ${t.cardHover} transition-colors`}
          >
            <span className={`text-sm font-medium ${t.text}`}>Offer Details</span>
            <svg
              className={`w-4 h-4 ${t.textSecondary} transition-transform ${
                isOrderDetailsExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {isOrderDetailsExpanded && (
            <div
              className="p-3 border-t border-gray-200 dark:border-gray-700"
              style={{ scrollbarGutter: 'stable' }}
            >
              <OrderDetailsSection
                order={order}
                offerString={fetchedOfferString || offerString}
                mode={mode}
                priceDeviationPercent={priceDeviationPercent}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
