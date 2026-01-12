'use client'

import type { AssetType, BaseAsset } from '@/entities/offer'
import { useCatTokens, useThemeClasses } from '@/shared/hooks'
import { assetInputAmounts, formatAssetAmountForInput } from '@/shared/lib/utils/chia-units'
import { useCallback, useRef, useState } from 'react'
import AmountInput from './AssetSelector/AmountInput'
import AssetIdInput from './AssetSelector/AssetIdInput'
import AssetTypeSelector from './AssetSelector/AssetTypeSelector'
import RemoveAssetButton from './AssetSelector/RemoveAssetButton'
import TokenSearchInput from './AssetSelector/TokenSearchInput'

export interface ExtendedAsset extends BaseAsset {
  searchQuery?: string
  showDropdown?: boolean
  _amountInput?: string // Temporary string for input while typing
}

export interface AssetSelectorProps {
  asset: ExtendedAsset
  onUpdate: (asset: ExtendedAsset) => void
  onRemove?: () => void
  placeholder?: string
  showRemoveButton?: boolean
  enabledAssetTypes?: AssetType[] // Optional filter for which asset types to show
  className?: string
}

/**
 * Generic Asset Selector Component
 * Supports XCH, CAT tokens, NFTs, and Options
 * Can be used throughout the app for asset selection
 */
export default function AssetSelector({
  asset,
  onUpdate,
  onRemove,
  placeholder = 'Select asset',
  showRemoveButton = true,
  enabledAssetTypes = ['xch', 'cat', 'nft', 'option'],
  className = '',
}: AssetSelectorProps) {
  const { t } = useThemeClasses()
  const { availableCatTokens, availableAssets, isLoading: isLoadingTickers } = useCatTokens()
  const [showDropdown, setShowDropdown] = useState(false)
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Use new Asset format if available, fallback to legacy CatTokenInfo
  const availableTokens =
    availableAssets.length > 0
      ? availableAssets.map((asset) => ({
          assetId: asset.assetId,
          ticker: asset.ticker,
          symbol: asset.symbol,
          name: asset.name,
        }))
      : availableCatTokens

  // Filter available asset types based on enabledAssetTypes prop
  const availableAssetTypes = enabledAssetTypes.filter((type) => {
    if (type === 'xch' || type === 'cat' || type === 'nft' || type === 'option') {
      return true
    }
    return false
  })

  const filteredTokens = useCallback(
    (searchQuery: string) => {
      if (!searchQuery) return availableTokens
      const query = searchQuery.toLowerCase()
      return availableTokens.filter(
        (token) =>
          token.ticker.toLowerCase().includes(query) ||
          (token.name && token.name.toLowerCase().includes(query)) ||
          (token.assetId && token.assetId.toLowerCase().includes(query)) // Also search by asset ID
      )
    },
    [availableTokens]
  )

  const selectToken = useCallback(
    (token: { assetId: string; ticker: string; symbol?: string; name?: string }) => {
      // Determine asset type: XCH if assetId is empty, otherwise CAT
      const assetType: AssetType = token.assetId === '' ? 'xch' : 'cat'
      onUpdate({
        ...asset,
        assetId: token.assetId,
        type: assetType,
        symbol: token.symbol || token.ticker,
        name: token.name,
        searchQuery: token.ticker,
        showDropdown: false,
      })
      setShowDropdown(false)
    },
    [asset, onUpdate]
  )

  const handleTypeChange = useCallback(
    (newType: AssetType) => {
      // Merge clear behavior into a single onUpdate call to avoid reintroducing stale data
      // Explicitly clear assetId, symbol, searchQuery, and showDropdown
      // Then set type and amount based on the new type
      const updatedAsset = {
        ...asset,
        assetId: '',
        symbol: '',
        searchQuery: '',
        showDropdown: false,
        type: newType === 'xch' ? 'cat' : newType, // Map 'xch' to 'cat' for unified token search
        amount: newType === 'nft' || newType === 'option' ? 1 : asset.amount,
      }
      onUpdate(updatedAsset)
    },
    [asset, onUpdate]
  )

  const handleSearchFocus = useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
    setShowDropdown(true)
  }, [])

  const handleSearchBlur = useCallback(() => {
    // Delay closing to allow click events on dropdown items
    blurTimeoutRef.current = setTimeout(() => {
      setShowDropdown(false)
    }, 200)
  }, [])

  const handleDropdownClose = useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
    setShowDropdown(false)
  }, [])

  const getAssetTypePlaceholder = (type: AssetType): string => {
    switch (type) {
      case 'cat':
        return isLoadingTickers ? 'Loading tokens...' : 'Search tokens (XCH, CAT tokens)...'
      case 'nft':
        return 'NFT Asset ID'
      case 'option':
        return 'Option Contract ID'
      default:
        return placeholder
    }
  }

  // Check if amount input should be hidden (NFT and Option always have amount = 1)
  const hideAmountInput = asset.type === 'nft' || asset.type === 'option'

  return (
    <div
      className={`flex items-center space-x-2 p-2.5 rounded-lg border ${t.border} ${t.card} ${className}`}
    >
      {/* Asset Type Selector */}
      <AssetTypeSelector
        value={asset.type}
        onChange={handleTypeChange}
        enabledAssetTypes={availableAssetTypes}
      />

      {/* Asset Selection */}
      <div className={`relative ${hideAmountInput ? 'flex-[2]' : 'flex-1'}`}>
        {asset.type === 'cat' || asset.type === 'xch' ? (
          <TokenSearchInput
            value={asset.searchQuery || ''}
            onChange={(value) =>
              onUpdate({
                ...asset,
                searchQuery: value,
              })
            }
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            placeholder={
              isLoadingTickers
                ? 'Loading tokens...'
                : 'Search tokens (XCH, CAT tokens, asset IDs)...'
            }
            disabled={isLoadingTickers}
            filteredTokens={filteredTokens(asset.searchQuery || '')}
            onSelectToken={selectToken}
            isDropdownOpen={showDropdown}
            onCloseDropdown={handleDropdownClose}
          />
        ) : (
          <AssetIdInput
            value={asset.assetId}
            onChange={(value) => {
              const updatedAsset = {
                ...asset,
                assetId: value,
                // Ensure amount is 1 for NFT and Option
                amount: asset.type === 'nft' || asset.type === 'option' ? 1 : asset.amount,
              }
              onUpdate(updatedAsset)
            }}
            placeholder={getAssetTypePlaceholder(asset.type)}
          />
        )}
      </div>

      {/* Amount Input - Hidden for NFT and Option */}
      {!hideAmountInput && (
        <div className="flex-1">
          <AmountInput
            value={asset.amount}
            tempInput={asset._amountInput}
            type={asset.type}
            onChange={(amount, tempInput) => {
              onUpdate({
                ...asset,
                _amountInput: tempInput,
                amount,
              })
            }}
            onBlur={() => {
              const inputValue = asset._amountInput || ''
              // Safely convert to number
              const finalAmount = assetInputAmounts.parse(inputValue, asset.type)
              // Preserve the input format if user typed something like "1.0" or "1.00"
              // Only clear tempInput if the formatted value matches the input (no loss of precision)
              const formatted = formatAssetAmountForInput(finalAmount, asset.type)
              const shouldPreserveInput = inputValue.includes('.') && inputValue !== formatted

              onUpdate({
                ...asset,
                amount: finalAmount,
                // Keep tempInput if user typed a decimal format that would be lost
                _amountInput: shouldPreserveInput ? inputValue : undefined,
              })
            }}
          />
        </div>
      )}

      {/* Remove Button */}
      {showRemoveButton && onRemove && <RemoveAssetButton onRemove={onRemove} />}
    </div>
  )
}
