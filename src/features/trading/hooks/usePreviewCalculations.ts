import { useCallback, useMemo } from 'react'
import { formatAssetAmountForInput } from '@/shared/lib/utils/chia-units'
import type { ExtendedAsset as ExtendedOfferAsset } from '@/shared/ui'
import { useCatTokens } from '@/entities/asset'

/**
 * Extract preview calculations to reduce complexity
 */
export function usePreviewCalculations(
  extendedMakerAssets: ExtendedOfferAsset[],
  extendedTakerAssets: ExtendedOfferAsset[]
) {
  const { getCatTokenInfo } = useCatTokens()

  const getTickerSymbol = useCallback(
    (assetId: string, code?: string): string => {
      if (code) return code
      if (!assetId) return 'XCH'
      const tickerInfo = getCatTokenInfo(assetId)
      return tickerInfo?.ticker || assetId.slice(0, 8)
    },
    [getCatTokenInfo]
  )

  const previewOffered = useMemo(
    () =>
      extendedMakerAssets
        .map((a) => {
          const amountDisplay =
            a._amountInput !== undefined && a._amountInput !== ''
              ? a._amountInput
              : formatAssetAmountForInput(a.amount, a.type) || String(a.amount)
          return `${amountDisplay} ${getTickerSymbol(a.assetId, a.symbol)}`
        })
        .join(', '),
    [extendedMakerAssets, getTickerSymbol]
  )

  const previewRequested = useMemo(
    () =>
      extendedTakerAssets
        .map((a) => {
          const amountDisplay =
            a._amountInput !== undefined && a._amountInput !== ''
              ? a._amountInput
              : formatAssetAmountForInput(a.amount, a.type) || String(a.amount)
          return `${amountDisplay} ${getTickerSymbol(a.assetId, a.symbol)}`
        })
        .join(', '),
    [extendedTakerAssets, getTickerSymbol]
  )

  return { previewOffered, previewRequested }
}
