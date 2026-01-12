'use client'

import { toWalletAssets } from '@/entities/asset'
import type { OfferDetails } from '@/entities/offer'
import { useOfferStorage } from '@/features/offers/model/useOfferStorage'
import { useOfferUpload } from '@/features/offers/model/useOfferUpload'
import { useCreateOffer, useWalletAddress } from '@/features/wallet'
import { useCatTokens, useThemeClasses } from '@/shared/hooks'
import { getNativeTokenTicker } from '@/shared/lib/config/environment'
import { logger } from '@/shared/lib/logger'
import {
  assetInputAmounts,
  convertToSmallestUnit,
  formatAssetAmountForInput,
  formatXchAmount,
  getAmountPlaceholder,
  getMinimumFeeInXch,
} from '@/shared/lib/utils/chia-units'
import AssetSelector, { type ExtendedAsset as ExtendedOfferAsset } from '@/shared/ui/AssetSelector'
import Button from '@/shared/ui/Button'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Loader2, Plus, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { OrderBookFilters, OrderBookOrder } from '../../lib/orderBookTypes'
import { useOrderBook } from '../../model/useOrderBook'
import { useOrderBookOfferSubmission } from '../../model/useOrderBookOfferSubmission'
import SleekPriceSlider from './SleekPriceSlider'

interface CreateOfferFormProps {
  order?: OrderBookOrder
  onOfferCreated?: (offer: OfferDetails) => void
  onClose?: () => void
  mode?: 'modal' | 'inline'
  initialPriceAdjustments?: { requested: number; offered: number }
  onOpenModal?: () => void
  filters?: OrderBookFilters
}

export default function CreateOfferForm({
  order,
  onOfferCreated,
  onClose,
  mode = 'inline',
  initialPriceAdjustments,
  onOpenModal,
  filters,
}: CreateOfferFormProps) {
  const { t } = useThemeClasses()
  const createOfferMutation = useCreateOffer()
  const offerStorage = useOfferStorage()
  const { uploadOfferToDexie, isUploading: isUploadingToDexie } = useOfferUpload()
  const { data: walletAddress } = useWalletAddress()
  const queryClient = useQueryClient()
  const { getCatTokenInfo } = useCatTokens()

  // Determine if order is buy or sell (from maker's perspective)
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

    // From maker's perspective (Limit tab):
    // If maker is requesting buyAsset, maker is SELLING buyAsset
    // If maker is offering buyAsset, maker is BUYING buyAsset
    if (requestingIsBuyAsset && !offeringIsBuyAsset) {
      return 'sell' // Maker is requesting buyAsset, so maker is selling it
    } else if (offeringIsBuyAsset && !requestingIsBuyAsset) {
      return 'buy' // Maker is offering buyAsset, so maker is buying it
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

  const { makerAssets, setMakerAssets, takerAssets, setTakerAssets, useAsTemplate, resetForm } =
    useOrderBookOfferSubmission()

  // Price adjustment sliders
  const [requestedAdjustment, setRequestedAdjustment] = useState(
    initialPriceAdjustments?.requested || 0
  )
  const [offeredAdjustment, setOfferedAdjustment] = useState(initialPriceAdjustments?.offered || 0)

  // Manual edit tracking - prevents sliders from overwriting manual edits
  const [manuallyEdited, setManuallyEdited] = useState<{
    requested: Set<number>
    offered: Set<number>
  }>({ requested: new Set(), offered: new Set() })

  // Base amounts (from order or when slider was last at 0)
  const [baseAmounts, setBaseAmounts] = useState<{
    requested: number[]
    offered: number[]
  }>({ requested: [], offered: [] })

  // Form state
  const [fee, setFee] = useState(getMinimumFeeInXch())
  const [feeInput, setFeeInput] = useState<string | undefined>(undefined)

  // Expiration settings
  const [expirationEnabled, setExpirationEnabled] = useState(false)
  const [expirationDays, setExpirationDays] = useState(1)
  const [expirationHours, setExpirationHours] = useState(0)
  const [expirationMinutes, setExpirationMinutes] = useState(0)

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isDetailedViewExpanded, setIsDetailedViewExpanded] = useState(false)

  // Helper to get ticker symbol
  const getTickerSymbol = useCallback(
    (assetId: string, code?: string): string => {
      if (code) return code
      if (!assetId) return 'XCH'
      const tickerInfo = getCatTokenInfo(assetId)
      return tickerInfo?.ticker || assetId.slice(0, 8)
    },
    [getCatTokenInfo]
  )

  // Step 6: Fix integration - only update when order ID actually changes
  // Use useMemo to compute base amounts immediately for instant UI updates
  const baseAmountsFromOrder = useMemo(() => {
    if (!order) return { requested: [], offered: [] }

    const requestedBase = order.requesting.map((asset) => {
      const amount = asset.amount || 0
      return typeof amount === 'number' && isFinite(amount) ? amount : 0
    })
    const offeredBase = order.offering.map((asset) => {
      const amount = asset.amount || 0
      return typeof amount === 'number' && isFinite(amount) ? amount : 0
    })

    return { requested: requestedBase, offered: offeredBase }
  }, [order?.id, order?.requesting, order?.offering])

  const prevOrderIdRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    const currentOrderId = order?.id
    const orderChanged = prevOrderIdRef.current !== currentOrderId

    // Only do anything if order actually changed
    if (!orderChanged) {
      return
    }

    if (order) {
      // Call useAsTemplate to populate form - this updates state synchronously
      useAsTemplate(order)

      // Store base amounts for sliders - use precomputed values for instant update
      setBaseAmounts(baseAmountsFromOrder)
      setRequestedAdjustment(initialPriceAdjustments?.requested || 0)
      setOfferedAdjustment(initialPriceAdjustments?.offered || 0)
      setManuallyEdited({ requested: new Set(), offered: new Set() })
      prevOrderIdRef.current = currentOrderId
    } else {
      // Reset when no order
      setBaseAmounts({ requested: [], offered: [] })
      setRequestedAdjustment(0)
      setOfferedAdjustment(0)
      setManuallyEdited({ requested: new Set(), offered: new Set() })
      prevOrderIdRef.current = undefined
    }
    // Only depend on order ID - useAsTemplate is stable (useCallback from hook)
  }, [order?.id, useAsTemplate, baseAmountsFromOrder])

  // Calculate adjusted assets - calculate directly without useMemo to avoid infinite loops
  // Simple calculation that runs on each render - no memoization needed
  const adjustedTakerAssets = (() => {
    if (!order || baseAmounts.requested.length === 0) return takerAssets
    if (takerAssets.length !== baseAmounts.requested.length) return takerAssets

    return takerAssets.map((asset, idx) => {
      if (manuallyEdited.requested.has(idx)) return asset

      const baseAmount = baseAmounts.requested[idx]
      if (
        baseAmount === undefined ||
        isNaN(baseAmount) ||
        !isFinite(baseAmount) ||
        baseAmount < 0
      ) {
        return asset
      }

      const adjustmentMultiplier = 1 + requestedAdjustment / 100
      const newAmount = baseAmount * adjustmentMultiplier

      if (isNaN(newAmount) || !isFinite(newAmount) || newAmount < 0) {
        return asset
      }

      return {
        ...asset,
        amount: newAmount,
      }
    })
  })()

  const adjustedMakerAssets = (() => {
    if (!order || baseAmounts.offered.length === 0) return makerAssets
    if (makerAssets.length !== baseAmounts.offered.length) return makerAssets

    return makerAssets.map((asset, idx) => {
      if (manuallyEdited.offered.has(idx)) return asset

      const baseAmount = baseAmounts.offered[idx]
      if (
        baseAmount === undefined ||
        isNaN(baseAmount) ||
        !isFinite(baseAmount) ||
        baseAmount < 0
      ) {
        return asset
      }

      const adjustmentMultiplier = 1 + offeredAdjustment / 100
      const newAmount = baseAmount * adjustmentMultiplier

      if (isNaN(newAmount) || !isFinite(newAmount) || newAmount < 0) {
        return asset
      }

      return {
        ...asset,
        amount: newAmount,
      }
    })
  })()

  // Step 8: Update base amounts with error handling - only when manually adding assets (no order)
  const prevTakerLengthRef = useRef(takerAssets.length)
  const prevMakerLengthRef = useRef(makerAssets.length)

  useEffect(() => {
    // Only update if length changed and no order (manual asset addition)
    if (!order && takerAssets.length > 0 && takerAssets.length !== prevTakerLengthRef.current) {
      setBaseAmounts((prev) => ({
        ...prev,
        requested: takerAssets.map((asset) => {
          const amount = asset.amount || 0
          return typeof amount === 'number' && isFinite(amount) && amount >= 0 ? amount : 0
        }),
      }))
      prevTakerLengthRef.current = takerAssets.length
    }
  }, [takerAssets.length, order])

  useEffect(() => {
    // Only update if length changed and no order (manual asset addition)
    if (!order && makerAssets.length > 0 && makerAssets.length !== prevMakerLengthRef.current) {
      setBaseAmounts((prev) => ({
        ...prev,
        offered: makerAssets.map((asset) => {
          const amount = asset.amount || 0
          return typeof amount === 'number' && isFinite(amount) && amount >= 0 ? amount : 0
        }),
      }))
      prevMakerLengthRef.current = makerAssets.length
    }
  }, [makerAssets.length, order])

  // Convert form assets to ExtendedOfferAsset format - calculate directly to avoid dependency issues
  const extendedMakerAssets: ExtendedOfferAsset[] = adjustedMakerAssets.map((asset) => ({
    assetId: asset.assetId,
    amount: asset.amount,
    type: asset.type,
    symbol: asset.symbol,
    searchQuery: asset.searchQuery || '',
    showDropdown: asset.showDropdown || false,
    _amountInput: (asset as ExtendedOfferAsset)._amountInput, // Preserve temporary input state
  }))

  const extendedTakerAssets: ExtendedOfferAsset[] = adjustedTakerAssets.map((asset) => ({
    assetId: asset.assetId,
    amount: asset.amount,
    type: asset.type,
    symbol: asset.symbol,
    searchQuery: asset.searchQuery || '',
    showDropdown: asset.showDropdown || false,
    _amountInput: (asset as ExtendedOfferAsset)._amountInput, // Preserve temporary input state
  }))

  // Form validation
  const isFormValid = useMemo(() => {
    return (
      extendedMakerAssets.length > 0 &&
      extendedTakerAssets.length > 0 &&
      extendedMakerAssets.every(
        (asset) => asset.amount > 0 && (asset.type === 'xch' || asset.assetId)
      ) &&
      extendedTakerAssets.every(
        (asset) => asset.amount > 0 && (asset.type === 'xch' || asset.assetId)
      ) &&
      fee >= 0
    )
  }, [extendedMakerAssets, extendedTakerAssets, fee])

  // Asset management methods
  const addOfferedAsset = useCallback(() => {
    setMakerAssets((prev) => [
      ...prev,
      {
        assetId: '',
        amount: 0,
        type: 'xch',
        symbol: '',
        searchQuery: '',
        showDropdown: false,
        _amountInput: undefined, // Initialize temporary input state
      },
    ])
  }, [setMakerAssets])

  const removeOfferedAsset = useCallback(
    (index: number) => {
      setMakerAssets((prev) => prev.filter((_, i) => i !== index))
      setManuallyEdited((prev) => {
        const newSet = new Set(prev.offered)
        newSet.delete(index)
        // Shift indices down for assets after removed one
        const shifted = new Set<number>()
        newSet.forEach((idx) => {
          if (idx > index) {
            shifted.add(idx - 1)
          } else {
            shifted.add(idx)
          }
        })
        return { ...prev, offered: shifted }
      })
    },
    [setMakerAssets]
  )

  const updateOfferedAsset = useCallback(
    (index: number, asset: ExtendedOfferAsset) => {
      setMakerAssets((prev) =>
        prev.map((a, i) =>
          i === index
            ? {
                ...a,
                assetId: asset.assetId || '',
                amount: asset.amount || 0,
                type: (asset.type === 'option' ? 'cat' : asset.type) as 'xch' | 'cat' | 'nft',
                symbol: asset.symbol || '',
                searchQuery: asset.searchQuery || '',
                showDropdown: asset.showDropdown || false,
                _amountInput: asset._amountInput, // Preserve temporary input state
              }
            : a
        )
      )
      // Mark as manually edited
      setManuallyEdited((prev) => ({
        ...prev,
        offered: new Set(prev.offered).add(index),
      }))
      // Update base amount to current value
      setBaseAmounts((prev) => ({
        ...prev,
        offered: prev.offered.map((base, idx) => (idx === index ? asset.amount || 0 : base)),
      }))
    },
    [setMakerAssets]
  )

  const addRequestedAsset = useCallback(() => {
    setTakerAssets((prev) => [
      ...prev,
      {
        assetId: '',
        amount: 0,
        type: 'xch',
        symbol: '',
        searchQuery: '',
        showDropdown: false,
        _amountInput: undefined, // Initialize temporary input state
      },
    ])
  }, [setTakerAssets])

  const removeRequestedAsset = useCallback(
    (index: number) => {
      setTakerAssets((prev) => prev.filter((_, i) => i !== index))
      setManuallyEdited((prev) => {
        const newSet = new Set(prev.requested)
        newSet.delete(index)
        // Shift indices down for assets after removed one
        const shifted = new Set<number>()
        newSet.forEach((idx) => {
          if (idx > index) {
            shifted.add(idx - 1)
          } else {
            shifted.add(idx)
          }
        })
        return { ...prev, requested: shifted }
      })
    },
    [setTakerAssets]
  )

  const updateRequestedAsset = useCallback(
    (index: number, asset: ExtendedOfferAsset) => {
      setTakerAssets((prev) =>
        prev.map((a, i) =>
          i === index
            ? {
                ...a,
                assetId: asset.assetId || '',
                amount: asset.amount || 0,
                type: (asset.type === 'option' ? 'cat' : asset.type) as 'xch' | 'cat' | 'nft',
                symbol: asset.symbol || '',
                searchQuery: asset.searchQuery || '',
                showDropdown: asset.showDropdown || false,
                _amountInput: asset._amountInput, // Preserve temporary input state
              }
            : a
        )
      )
      // Mark as manually edited
      setManuallyEdited((prev) => ({
        ...prev,
        requested: new Set(prev.requested).add(index),
      }))
      // Update base amount to current value
      setBaseAmounts((prev) => ({
        ...prev,
        requested: prev.requested.map((base, idx) => (idx === index ? asset.amount || 0 : base)),
      }))
    },
    [setTakerAssets]
  )

  // Handle fee input - validation handled by assetInputAmounts
  const handleFeeChange = useCallback((value: string) => {
    setFeeInput(value)
    // Safely convert to number - assetInputAmounts handles validation
    const parsed = assetInputAmounts.parse(value, 'xch')
    setFee(parsed)
  }, [])

  // Get order book refresh function
  const { refreshOrderBook } = useOrderBook()

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setErrorMessage('')
      setSuccessMessage('')

      if (!isFormValid) {
        setErrorMessage('Please fill in all required fields')
        return
      }

      setIsSubmitting(true)

      try {
        // Convert form assets to wallet format
        const offerAssets = toWalletAssets(
          extendedMakerAssets.map((asset) => ({
            ...asset,
            amount: Number(asset.amount) || 0,
          })),
          convertToSmallestUnit
        )

        const requestAssets = toWalletAssets(
          extendedTakerAssets.map((asset) => ({
            ...asset,
            amount: Number(asset.amount) || 0,
          })),
          convertToSmallestUnit
        )

        // Create offer
        const result = await createOfferMutation.mutateAsync({
          walletId: 1,
          offerAssets,
          requestAssets,
          fee: convertToSmallestUnit(Number(fee) || 0, 'xch'),
        })

        if (!result || !result.offer) {
          throw new Error('Wallet did not return a valid offer string')
        }

        const newOffer: OfferDetails = {
          id: result?.id || Date.now().toString(),
          tradeId: result?.tradeId || result?.id || 'unknown',
          offerString: result?.offer || '',
          status: 'active',
          createdAt: new Date(),
          assetsOffered: extendedMakerAssets.map((asset) => ({
            assetId: asset.assetId || '',
            amount: Number(asset.amount) || 0,
            type: asset.type,
            symbol: asset.symbol || asset.type.toUpperCase(),
          })),
          assetsRequested: extendedTakerAssets.map((asset) => ({
            assetId: asset.assetId || '',
            amount: Number(asset.amount) || 0,
            type: asset.type,
            symbol: asset.symbol || asset.type.toUpperCase(),
          })),
          fee: Number(fee) || 0,
          creatorAddress: walletAddress?.address || 'unknown',
        }

        // Save offer to IndexedDB
        await offerStorage.saveOffer(newOffer, true)

        // Upload to Dexie
        try {
          await uploadOfferToDexie(newOffer.id, newOffer.offerString)
        } catch (uploadError) {
          // Log but don't fail - offer is still created locally
          logger.error('Failed to upload to Dexie:', uploadError)
        }

        // Refresh order book
        refreshOrderBook()

        // Invalidate order book queries
        queryClient.invalidateQueries({ queryKey: ['orderBook'] })

        setSuccessMessage('Offer created successfully!')
        onOfferCreated?.(newOffer)

        // Reset form after a short delay
        setTimeout(() => {
          resetForm()
          setRequestedAdjustment(0)
          setOfferedAdjustment(0)
          setFee(getMinimumFeeInXch())
          setFeeInput(undefined)
          setSuccessMessage('')
          setManuallyEdited({ requested: new Set(), offered: new Set() })
          setBaseAmounts({ requested: [], offered: [] })
          if (mode === 'modal' && onClose) {
            onClose()
          }
        }, 1500)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred'
        setErrorMessage(`Failed to create offer: ${errorMsg}`)
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      isFormValid,
      extendedMakerAssets,
      extendedTakerAssets,
      fee,
      createOfferMutation,
      offerStorage,
      walletAddress,
      uploadOfferToDexie,
      refreshOrderBook,
      queryClient,
      onOfferCreated,
      resetForm,
      mode,
      onClose,
    ]
  )

  // Calculate preview totals - show full amount user input
  const previewOffered = extendedMakerAssets
    .map((a) => {
      // Use _amountInput if available (exact user input), otherwise format with full precision
      const amountDisplay =
        a._amountInput !== undefined && a._amountInput !== ''
          ? a._amountInput
          : formatAssetAmountForInput(a.amount, a.type) || String(a.amount)
      return `${amountDisplay} ${getTickerSymbol(a.assetId, a.symbol)}`
    })
    .join(', ')

  const previewRequested = extendedTakerAssets
    .map((a) => {
      // Use _amountInput if available (exact user input), otherwise format with full precision
      const amountDisplay =
        a._amountInput !== undefined && a._amountInput !== ''
          ? a._amountInput
          : formatAssetAmountForInput(a.amount, a.type) || String(a.amount)
      return `${amountDisplay} ${getTickerSymbol(a.assetId, a.symbol)}`
    })
    .join(', ')

  const containerClass = mode === 'modal' ? 'space-y-4' : 'space-y-3'

  return (
    <div className={containerClass}>
      <form onSubmit={handleSubmit} className={containerClass}>
        {/* Preview Section */}
        <div className={`p-3 rounded-lg ${t.cardHover} backdrop-blur-xl border ${t.border}`}>
          <h4 className={`text-xs font-medium ${t.text} mb-2`}>Offer Preview</h4>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className={t.textSecondary}>You will offer:</span>
              <span className={t.text}>{previewOffered || 'No assets'}</span>
            </div>
            <div className="flex justify-between">
              <span className={t.textSecondary}>You will receive:</span>
              <span className={t.text}>{previewRequested || 'No assets'}</span>
            </div>
            <div className={`flex justify-between border-t ${t.border} pt-1.5 mt-1.5`}>
              <span className={`font-medium ${t.text}`}>Fee:</span>
              <span className={`font-medium ${t.text}`}>{formatXchAmount(fee)} XCH</span>
            </div>
          </div>
        </div>

        {/* Transaction Fee Input */}
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

        {/* Create Offer Button */}
        <div className="flex flex-wrap justify-end gap-2">
          {mode === 'modal' && onClose && (
            <Button type="button" onClick={onClose} variant="secondary" disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          {mode === 'inline' && order && onOpenModal && (
            <Button type="button" onClick={onOpenModal} variant="secondary" disabled={isSubmitting}>
              Create New Offer
            </Button>
          )}
          <Button
            type="submit"
            disabled={!isFormValid || isSubmitting || isUploadingToDexie}
            variant={orderType === 'sell' ? 'danger' : 'success'}
            icon={isSubmitting ? undefined : Plus}
          >
            {isSubmitting || isUploadingToDexie ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                {isUploadingToDexie ? 'Uploading...' : 'Creating...'}
              </>
            ) : (
              'Create Offer'
            )}
          </Button>
        </div>

        {/* Offered/Requested Asset Sections - Only show in modal mode */}
        {mode === 'modal' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Offered Section */}
            <div
              className="p-4 rounded-lg backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-white/10 dark:border-white/5"
              style={{
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              }}
            >
              <div className="mb-3">
                <h3 className={`text-sm font-semibold ${t.text} mb-0.5`}>Offered</h3>
                <p className={`text-xs ${t.textSecondary}`}>Assets you are offering.</p>
              </div>
              <div className="space-y-2">
                {extendedMakerAssets.map((asset, index) => (
                  <AssetSelector
                    key={`offered-${index}`}
                    asset={asset}
                    onUpdate={(updatedAsset) => updateOfferedAsset(index, updatedAsset)}
                    onRemove={() => removeOfferedAsset(index)}
                  />
                ))}
                <Button
                  type="button"
                  onClick={addOfferedAsset}
                  variant="secondary"
                  icon={Plus}
                  className="w-full"
                >
                  Add Asset
                </Button>
              </div>
            </div>

            {/* Requested Section */}
            <div
              className="p-4 rounded-lg backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-white/10 dark:border-white/5"
              style={{
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              }}
            >
              <div className="mb-3">
                <h3 className={`text-sm font-semibold ${t.text} mb-0.5`}>Requested</h3>
                <p className={`text-xs ${t.textSecondary}`}>Assets you are requesting.</p>
              </div>
              <div className="space-y-2">
                {extendedTakerAssets.map((asset, index) => (
                  <AssetSelector
                    key={`requested-${index}`}
                    asset={asset}
                    onUpdate={(updatedAsset) => updateRequestedAsset(index, updatedAsset)}
                    onRemove={() => removeRequestedAsset(index)}
                  />
                ))}
                <Button
                  type="button"
                  onClick={addRequestedAsset}
                  variant="secondary"
                  icon={Plus}
                  className="w-full"
                >
                  Add Asset
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Price Adjustment Sliders */}
        {order &&
          order.requesting &&
          order.requesting.length > 0 &&
          order.offering &&
          order.offering.length > 0 && (
            <div
              className="p-2 rounded-lg backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-white/10 dark:border-white/5"
              style={{
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <h4
                  className={`text-[10px] font-medium ${t.textSecondary} uppercase tracking-wide`}
                >
                  Price Adjustment
                </h4>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setRequestedAdjustment(0)
                    setOfferedAdjustment(0)
                  }}
                  className={`p-1 rounded hover:bg-white/10 dark:hover:bg-black/10 transition-colors ${t.textSecondary} hover:text-current`}
                  title="Reset to original prices"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-1.5">
                <SleekPriceSlider
                  value={requestedAdjustment}
                  onChange={setRequestedAdjustment}
                  label="Requested Amounts"
                />
                <SleekPriceSlider
                  value={offeredAdjustment}
                  onChange={setOfferedAdjustment}
                  label="Offered Amounts"
                />
              </div>
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

      {/* Collapsible Detailed View */}
      <div
        className={`rounded-lg backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-white/10 dark:border-white/5 overflow-hidden transition-all`}
        style={{
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
        }}
      >
        <button
          type="button"
          onClick={() => setIsDetailedViewExpanded(!isDetailedViewExpanded)}
          className={`w-full p-3 flex items-center justify-between ${t.cardHover} transition-colors`}
        >
          <span className={`text-sm font-medium ${t.text}`}>Advanced Settings</span>
          {isDetailedViewExpanded ? (
            <ChevronDown className={`w-4 h-4 ${t.textSecondary}`} />
          ) : (
            <ChevronRight className={`w-4 h-4 ${t.textSecondary}`} />
          )}
        </button>
        {isDetailedViewExpanded && (
          <div className="p-3 border-t border-white/10 dark:border-white/5 space-y-4">
            {/* Expiration Settings */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={`block text-xs font-medium ${t.text}`}>Expiring offer</label>
                <button
                  type="button"
                  onClick={() => setExpirationEnabled(!expirationEnabled)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full backdrop-blur-3xl transition-all duration-300 focus:outline-none focus:ring-2 ${t.focusRing} overflow-hidden ${
                    expirationEnabled
                      ? 'bg-blue-500/20 border border-blue-400/30'
                      : 'bg-white/5 border border-white/10'
                  }`}
                >
                  <span
                    className={`relative inline-block h-3 w-3 transform rounded-full backdrop-blur-3xl transition-all duration-300 ${
                      expirationEnabled
                        ? 'translate-x-[20px] bg-blue-500/40'
                        : 'translate-x-0.5 bg-white/30'
                    }`}
                  />
                </button>
              </div>
              {expirationEnabled && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <input
                      type="number"
                      min="0"
                      value={expirationDays}
                      onChange={(e) => setExpirationDays(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className={`w-full px-2 py-1.5 text-xs border ${t.border} rounded-lg backdrop-blur-xl ${t.input} ${t.text}`}
                    />
                    <label className={`block text-[10px] ${t.textSecondary} mt-1 text-center`}>
                      Days
                    </label>
                  </div>
                  <div>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={expirationHours}
                      onChange={(e) => setExpirationHours(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className={`w-full px-2 py-1.5 text-xs border ${t.border} rounded-lg backdrop-blur-xl ${t.input} ${t.text}`}
                    />
                    <label className={`block text-[10px] ${t.textSecondary} mt-1 text-center`}>
                      Hours
                    </label>
                  </div>
                  <div>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={expirationMinutes}
                      onChange={(e) => setExpirationMinutes(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className={`w-full px-2 py-1.5 text-xs border ${t.border} rounded-lg backdrop-blur-xl ${t.input} ${t.text}`}
                    />
                    <label className={`block text-[10px] ${t.textSecondary} mt-1 text-center`}>
                      Minutes
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
