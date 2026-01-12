'use client'

import { toWalletAssets } from '@/entities/asset'
import type { OfferDetails } from '@/entities/offer'
import { useOfferStorage } from '@/features/offers/model/useOfferStorage'
import { useOfferUpload } from '@/features/offers/model/useOfferUpload'
import { useCreateOffer, useWalletAddress } from '@/features/wallet'
import { useCatTokens, useThemeClasses } from '@/shared/hooks'
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
import { Loader2, Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { OrderBookOrder } from '../../lib/orderBookTypes'
import { useOrderBook } from '../../model/useOrderBook'
import { useOrderBookOfferSubmission } from '../../model/useOrderBookOfferSubmission'
import OrderDetailsSection from '../take-offer/OrderDetailsSection'
import PriceAdjustmentSlider from './PriceAdjustmentSlider'

interface MakerOfferContentProps {
  order?: OrderBookOrder
  onOfferCreated?: (offer: OfferDetails) => void
  onClose?: () => void
  mode?: 'modal' | 'inline'
}

export default function MakerOfferContent({
  order,
  onOfferCreated,
  onClose,
  mode = 'inline',
}: MakerOfferContentProps) {
  const { t } = useThemeClasses()
  const createOfferMutation = useCreateOffer()
  const offerStorage = useOfferStorage()
  const { uploadOfferToDexie, isUploading: isUploadingToDexie } = useOfferUpload()
  const { data: walletAddress } = useWalletAddress()
  const queryClient = useQueryClient()
  const { getCatTokenInfo } = useCatTokens()

  const { makerAssets, setMakerAssets, takerAssets, setTakerAssets, useAsTemplate, resetForm } =
    useOrderBookOfferSubmission()

  // Price adjustment sliders
  const [requestedAdjustment, setRequestedAdjustment] = useState(0)
  const [offeredAdjustment, setOfferedAdjustment] = useState(0)

  // Form state
  const [fee, setFee] = useState(getMinimumFeeInXch())
  const [feeInput, setFeeInput] = useState<string | undefined>(undefined)

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isOrderDetailsExpanded, setIsOrderDetailsExpanded] = useState(false)

  // Store original amounts for price adjustment calculations
  const [originalRequestedAmounts, setOriginalRequestedAmounts] = useState<
    Array<{ amount: number; symbol: string }>
  >([])
  const [originalOfferedAmounts, setOriginalOfferedAmounts] = useState<
    Array<{ amount: number; symbol: string }>
  >([])

  // Fill form from order when order changes
  useEffect(() => {
    if (order) {
      useAsTemplate(order)

      // Store original amounts for sliders
      const requested = order.requesting.map((asset) => ({
        amount: asset.amount,
        symbol: asset.code || getCatTokenInfo(asset.id)?.ticker || asset.id.slice(0, 8),
      }))
      const offered = order.offering.map((asset) => ({
        amount: asset.amount,
        symbol: asset.code || getCatTokenInfo(asset.id)?.ticker || asset.id.slice(0, 8),
      }))

      setOriginalRequestedAmounts(requested)
      setOriginalOfferedAmounts(offered)
      setRequestedAdjustment(0)
      setOfferedAdjustment(0)
    }
  }, [order, useAsTemplate, getCatTokenInfo])

  // Apply price adjustments when sliders change
  useEffect(() => {
    if (originalRequestedAmounts.length > 0 && requestedAdjustment !== 0) {
      const adjusted = takerAssets.map((asset, idx) => {
        const original = originalRequestedAmounts[idx]
        if (original) {
          return {
            ...asset,
            amount: original.amount * (1 + requestedAdjustment / 100),
          }
        }
        return asset
      })
      setTakerAssets(adjusted)
    } else if (requestedAdjustment === 0 && originalRequestedAmounts.length > 0) {
      // Reset to original when slider is at 0
      const reset = takerAssets.map((asset, idx) => {
        const original = originalRequestedAmounts[idx]
        if (original) {
          return {
            ...asset,
            amount: original.amount,
          }
        }
        return asset
      })
      setTakerAssets(reset)
    }
  }, [requestedAdjustment, originalRequestedAmounts, setTakerAssets])

  useEffect(() => {
    if (originalOfferedAmounts.length > 0 && offeredAdjustment !== 0) {
      const adjusted = makerAssets.map((asset, idx) => {
        const original = originalOfferedAmounts[idx]
        if (original) {
          return {
            ...asset,
            amount: original.amount * (1 + offeredAdjustment / 100),
          }
        }
        return asset
      })
      setMakerAssets(adjusted)
    } else if (offeredAdjustment === 0 && originalOfferedAmounts.length > 0) {
      // Reset to original when slider is at 0
      const reset = makerAssets.map((asset, idx) => {
        const original = originalOfferedAmounts[idx]
        if (original) {
          return {
            ...asset,
            amount: original.amount,
          }
        }
        return asset
      })
      setMakerAssets(reset)
    }
  }, [offeredAdjustment, originalOfferedAmounts, setMakerAssets])

  // Convert form assets to ExtendedOfferAsset format
  const extendedMakerAssets: ExtendedOfferAsset[] = useMemo(
    () =>
      makerAssets.map((asset) => ({
        assetId: asset.assetId,
        amount: asset.amount,
        type: asset.type,
        symbol: asset.symbol,
        searchQuery: asset.searchQuery || '',
        showDropdown: asset.showDropdown || false,
      })),
    [makerAssets]
  )

  const extendedTakerAssets: ExtendedOfferAsset[] = useMemo(
    () =>
      takerAssets.map((asset) => ({
        assetId: asset.assetId,
        amount: asset.amount,
        type: asset.type,
        symbol: asset.symbol,
        searchQuery: asset.searchQuery || '',
        showDropdown: asset.showDropdown || false,
      })),
    [takerAssets]
  )

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
    setMakerAssets([
      ...makerAssets,
      {
        assetId: '',
        amount: 0,
        type: 'xch',
        symbol: '',
        searchQuery: '',
        showDropdown: false,
      },
    ])
  }, [makerAssets, setMakerAssets])

  const removeOfferedAsset = useCallback(
    (index: number) => {
      setMakerAssets(makerAssets.filter((_, i) => i !== index))
    },
    [makerAssets, setMakerAssets]
  )

  const updateOfferedAsset = useCallback(
    (index: number, asset: ExtendedOfferAsset) => {
      const updated = makerAssets.map((a, i) =>
        i === index
          ? {
              ...a,
              assetId: asset.assetId || '',
              amount: asset.amount || 0,
              type: (asset.type === 'option' ? 'cat' : asset.type) as 'xch' | 'cat' | 'nft',
              symbol: asset.symbol || '',
              searchQuery: asset.searchQuery || '',
              showDropdown: asset.showDropdown || false,
            }
          : a
      )
      setMakerAssets(updated)
    },
    [makerAssets, setMakerAssets]
  )

  const addRequestedAsset = useCallback(() => {
    setTakerAssets([
      ...takerAssets,
      {
        assetId: '',
        amount: 0,
        type: 'xch',
        symbol: '',
        searchQuery: '',
        showDropdown: false,
      },
    ])
  }, [takerAssets, setTakerAssets])

  const removeRequestedAsset = useCallback(
    (index: number) => {
      setTakerAssets(takerAssets.filter((_, i) => i !== index))
    },
    [takerAssets, setTakerAssets]
  )

  const updateRequestedAsset = useCallback(
    (index: number, asset: ExtendedOfferAsset) => {
      const updated = takerAssets.map((a, i) =>
        i === index
          ? {
              ...a,
              assetId: asset.assetId || '',
              amount: asset.amount || 0,
              type: (asset.type === 'option' ? 'cat' : asset.type) as 'xch' | 'cat' | 'nft',
              symbol: asset.symbol || '',
              searchQuery: asset.searchQuery || '',
              showDropdown: asset.showDropdown || false,
            }
          : a
      )
      setTakerAssets(updated)
    },
    [takerAssets, setTakerAssets]
  )

  // Handle fee input with standardized validation (XCH allows floats)
  const handleFeeChange = useCallback((value: string) => {
    if (assetInputAmounts.isValid(value, 'xch')) {
      setFeeInput(value)
      // Safely convert to number
      const parsed = assetInputAmounts.parse(value, 'xch')
      setFee(parsed)
    }
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

  const containerClass = mode === 'modal' ? 'space-y-4' : 'space-y-3'

  return (
    <div className={containerClass}>
      <form onSubmit={handleSubmit} className={containerClass}>
        {/* Price Adjustment Sliders */}
        {order && (
          <div
            className={`space-y-3 p-3 rounded-lg ${t.cardHover} backdrop-blur-xl border ${t.border}`}
          >
            <h4 className={`text-xs font-medium ${t.text} mb-2`}>Price Adjustment</h4>

            {/* Requested Amounts Slider */}
            <PriceAdjustmentSlider
              value={requestedAdjustment}
              onChange={setRequestedAdjustment}
              label="Requested Amounts"
              originalAmounts={originalRequestedAmounts}
            />

            {/* Offered Amounts Slider */}
            <PriceAdjustmentSlider
              value={offeredAdjustment}
              onChange={setOfferedAdjustment}
              label="Offered Amounts"
              originalAmounts={originalOfferedAmounts}
            />
          </div>
        )}

        {/* Two Column Layout: Offered | Requested */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Offered Section */}
          <div className="space-y-3">
            <div>
              <h3 className={`text-sm font-medium ${t.text} mb-0.5`}>Offered</h3>
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
          <div className="space-y-3">
            <div>
              <h3 className={`text-sm font-medium ${t.text} mb-0.5`}>Requested</h3>
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

        {/* Transaction Fee */}
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
          <Button
            type="submit"
            disabled={!isFormValid || isSubmitting || isUploadingToDexie}
            variant="success"
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

      {/* Order Details Section - Collapsible, only show if order is provided */}
      {order && (
        <div
          className={`rounded-lg ${t.cardHover} backdrop-blur-xl border ${t.border} overflow-hidden`}
        >
          <button
            type="button"
            onClick={() => setIsOrderDetailsExpanded(!isOrderDetailsExpanded)}
            className={`w-full p-3 flex items-center justify-between ${t.cardHover} transition-colors`}
          >
            <span className={`text-sm font-medium ${t.text}`}>Order Details</span>
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
              <OrderDetailsSection order={order} mode={mode} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
