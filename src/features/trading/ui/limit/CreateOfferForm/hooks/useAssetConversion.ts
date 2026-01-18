import { useMemo } from 'react'
import type { ExtendedAsset as ExtendedOfferAsset } from '@/shared/ui'

interface AssetItem {
  assetId: string
  amount: number
  type: 'xch' | 'cat' | 'nft'
  symbol: string
  searchQuery?: string
  showDropdown?: boolean
}

/**
 * Extract asset conversion logic to reduce complexity
 */
export function useAssetConversion(
  adjustedMakerAssets: AssetItem[],
  adjustedTakerAssets: AssetItem[]
) {
  const extendedMakerAssets: ExtendedOfferAsset[] = useMemo(
    () =>
      adjustedMakerAssets.map((asset) => {
        const extended = asset as ExtendedOfferAsset
        return {
          assetId: asset.assetId,
          amount: asset.amount,
          type: asset.type,
          symbol: asset.symbol,
          searchQuery: extended.searchQuery || '',
          showDropdown: extended.showDropdown || false,
          _amountInput: extended._amountInput,
        }
      }),
    [adjustedMakerAssets]
  )

  const extendedTakerAssets: ExtendedOfferAsset[] = useMemo(
    () =>
      adjustedTakerAssets.map((asset) => {
        const extended = asset as ExtendedOfferAsset
        return {
          assetId: asset.assetId,
          amount: asset.amount,
          type: asset.type,
          symbol: asset.symbol,
          searchQuery: extended.searchQuery || '',
          showDropdown: extended.showDropdown || false,
          _amountInput: extended._amountInput,
        }
      }),
    [adjustedTakerAssets]
  )

  return { extendedMakerAssets, extendedTakerAssets }
}
