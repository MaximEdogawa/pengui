'use client'

import { useDexieDataService } from '@/features/offers/api/useDexieDataService'
import { useCatTokens } from '@/shared/hooks/useTickers'
import { getNativeTokenTicker } from '@/shared/lib/config/environment'
import { logger } from '@/shared/lib/logger'
import { useCallback, useState } from 'react'
import type { OrderBookOrder } from '../lib/orderBookTypes'

interface AssetItem {
  assetId: string
  amount: number
  type: 'xch' | 'cat' | 'nft'
  symbol: string
  searchQuery?: string
  showDropdown?: boolean
}

export function useOrderBookOfferSubmission() {
  const dexieDataService = useDexieDataService()
  const { getCatTokenInfo } = useCatTokens()

  const [selectedOrderForTaking, setSelectedOrderForTaking] = useState<OrderBookOrder | null>(null)
  const [fetchedOfferString, setFetchedOfferString] = useState<string>('')
  const [priceAdjustment, setPriceAdjustment] = useState(0)
  const [makerAssets, setMakerAssets] = useState<AssetItem[]>([
    { assetId: '', amount: 0, type: 'xch', symbol: '', searchQuery: '', showDropdown: false },
  ])
  const [takerAssets, setTakerAssets] = useState<AssetItem[]>([
    { assetId: '', amount: 0, type: 'xch', symbol: '', searchQuery: '', showDropdown: false },
  ])

  const isXchAsset = useCallback((assetId: string): boolean => {
    return !assetId || assetId === '' || assetId.toLowerCase() === 'xch'
  }, [])

  const getTickerSymbol = useCallback(
    (assetId: string, code?: string): string => {
      if (code) return code
      if (!assetId) return getNativeTokenTicker()
      const tickerInfo = getCatTokenInfo(assetId)
      return tickerInfo?.ticker || assetId.slice(0, 8)
    },
    [getCatTokenInfo]
  )

  /**
   * Fill form from order book (Taker mode - swap perspective)
   * When taking an offer, swap the perspective:
   * - Their offering becomes your selling
   * - Their receiving becomes your buying
   */
  const fillFromOrderBook = useCallback(
    async (order: OrderBookOrder) => {
      // Store the selected order for taking
      setSelectedOrderForTaking(order)

      // Fetch the offer string using the order ID
      try {
        const response = await dexieDataService.inspectOffer(order.id)
        if (response.success && response.offer?.offer) {
          setFetchedOfferString(response.offer.offer)
        } else {
          setFetchedOfferString('')
          logger.warn('Could not fetch offer string for order:', order.id)
        }
      } catch (error) {
        logger.error('Failed to fetch offer string:', error)
        setFetchedOfferString('')
      }

      // Convert order data to the format expected by the component
      // For taker mode: swap perspective
      // Their offering = your selling (makerAssets)
      // Their receiving = your buying (takerAssets)
      const newMakerAssets: AssetItem[] = order.offering.map((asset) => {
        const ticker = asset.code || getTickerSymbol(asset.id)
        return {
          assetId: asset.id,
          amount: asset.amount,
          type: (isXchAsset(asset.id) ? 'xch' : 'cat') as 'xch' | 'cat' | 'nft',
          symbol: ticker,
          searchQuery: ticker,
          showDropdown: false,
        }
      })

      const newTakerAssets: AssetItem[] = order.requesting.map((asset) => {
        const ticker = asset.code || getTickerSymbol(asset.id)
        return {
          assetId: asset.id,
          amount: asset.amount,
          type: (isXchAsset(asset.id) ? 'xch' : 'cat') as 'xch' | 'cat' | 'nft',
          symbol: ticker,
          searchQuery: ticker,
          showDropdown: false,
        }
      })

      setMakerAssets(newMakerAssets)
      setTakerAssets(newTakerAssets)
    },
    [dexieDataService, getTickerSymbol, isXchAsset]
  )

  /**
   * Use order as template (Maker mode - keep as-is)
   * When making a similar offer, keep the same perspective:
   * - Their offering = your offering
   * - Their receiving = your receiving
   */
  const useAsTemplate = useCallback(
    (order: OrderBookOrder) => {
      const newMakerAssets: AssetItem[] = order.offering.map((asset) => {
        const ticker = asset.code || getTickerSymbol(asset.id)
        return {
          assetId: asset.id,
          amount: asset.amount,
          type: (isXchAsset(asset.id) ? 'xch' : 'cat') as 'xch' | 'cat' | 'nft',
          symbol: ticker,
          searchQuery: ticker,
          showDropdown: false,
        }
      })

      const newTakerAssets: AssetItem[] = order.requesting.map((asset) => {
        const ticker = asset.code || getTickerSymbol(asset.id)
        return {
          assetId: asset.id,
          amount: asset.amount,
          type: (isXchAsset(asset.id) ? 'xch' : 'cat') as 'xch' | 'cat' | 'nft',
          symbol: ticker,
          searchQuery: ticker,
          showDropdown: false,
        }
      })

      setMakerAssets(newMakerAssets)
      setTakerAssets(newTakerAssets)
    },
    [getTickerSymbol, isXchAsset]
  )

  /**
   * Apply price adjustment to asset amounts
   * @param amounts - Array of assets to adjust
   * @param adjustmentPercent - Percentage adjustment (-100 to +100)
   * @returns New array with adjusted amounts
   */
  const applyPriceAdjustment = useCallback(
    (amounts: AssetItem[], adjustmentPercent: number): AssetItem[] => {
      return amounts.map((asset) => ({
        ...asset,
        amount: asset.amount * (1 + adjustmentPercent / 100),
      }))
    },
    []
  )

  const resetForm = useCallback(() => {
    setMakerAssets([
      {
        assetId: '',
        amount: 0,
        type: 'xch',
        symbol: '',
        searchQuery: '',
        showDropdown: false,
      },
    ])
    setTakerAssets([
      {
        assetId: '',
        amount: 0,
        type: 'xch',
        symbol: '',
        searchQuery: '',
        showDropdown: false,
      },
    ])
    setPriceAdjustment(0)
    setSelectedOrderForTaking(null)
    setFetchedOfferString('')
  }, [])

  return {
    // State
    selectedOrderForTaking,
    fetchedOfferString,
    priceAdjustment,
    setPriceAdjustment,
    makerAssets,
    setMakerAssets,
    takerAssets,
    setTakerAssets,

    // Methods
    fillFromOrderBook,
    useAsTemplate,
    applyPriceAdjustment,
    resetForm,
  }
}
