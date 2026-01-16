import { useMemo } from 'react'
import type { ExtendedAsset as ExtendedOfferAsset } from '@/shared/ui/AssetSelector'

/**
 * Extract form validation logic to reduce complexity
 */
export function useFormValidation(
  extendedMakerAssets: ExtendedOfferAsset[],
  extendedTakerAssets: ExtendedOfferAsset[],
  fee: number
) {
  return useMemo(() => {
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
}
