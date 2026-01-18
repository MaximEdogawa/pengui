import { useEffect, useState } from 'react'
import type { OrderBookOrder } from '../../../../lib/orderBookTypes'
import { useCatTokens } from '@/entities/asset'
import type { AssetItem } from '../../../../model/useOrderBookOfferSubmission'

interface UsePriceAdjustmentOptions {
  order: OrderBookOrder | undefined
  useAsTemplate: (order: OrderBookOrder) => void
  makerAssets: AssetItem[]
  takerAssets: AssetItem[]
  setMakerAssets: (assets: AssetItem[]) => void
  setTakerAssets: (assets: AssetItem[]) => void
}

export function usePriceAdjustment({
  order,
  useAsTemplate,
  makerAssets,
  takerAssets,
  setMakerAssets,
  setTakerAssets,
}: UsePriceAdjustmentOptions) {
  const { getCatTokenInfo } = useCatTokens()
  const [requestedAdjustment, setRequestedAdjustment] = useState(0)
  const [offeredAdjustment, setOfferedAdjustment] = useState(0)
  const [originalRequestedAmounts, setOriginalRequestedAmounts] = useState<
    Array<{ amount: number; symbol: string }>
  >([])
  const [originalOfferedAmounts, setOriginalOfferedAmounts] = useState<
    Array<{ amount: number; symbol: string }>
  >([])

  useEffect(() => {
    if (order) {
      // useAsTemplate is a callback function, not a React hook
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useAsTemplate(order)
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

  useEffect(() => {
    if (originalRequestedAmounts.length > 0 && requestedAdjustment !== 0) {
      const adjusted = takerAssets.map((asset, idx) => {
        const original = originalRequestedAmounts[idx]
        return original ? { ...asset, amount: original.amount * (1 + requestedAdjustment / 100) } : asset
      })
      setTakerAssets(adjusted)
    } else if (requestedAdjustment === 0 && originalRequestedAmounts.length > 0) {
      const reset = takerAssets.map((asset, idx) => {
        const original = originalRequestedAmounts[idx]
        return original ? { ...asset, amount: original.amount } : asset
      })
      setTakerAssets(reset)
    }
  }, [requestedAdjustment, originalRequestedAmounts, takerAssets, setTakerAssets])

  useEffect(() => {
    if (originalOfferedAmounts.length > 0 && offeredAdjustment !== 0) {
      const adjusted = makerAssets.map((asset, idx) => {
        const original = originalOfferedAmounts[idx]
        return original ? { ...asset, amount: original.amount * (1 + offeredAdjustment / 100) } : asset
      })
      setMakerAssets(adjusted)
    } else if (offeredAdjustment === 0 && originalOfferedAmounts.length > 0) {
      const reset = makerAssets.map((asset, idx) => {
        const original = originalOfferedAmounts[idx]
        return original ? { ...asset, amount: original.amount } : asset
      })
      setMakerAssets(reset)
    }
  }, [offeredAdjustment, originalOfferedAmounts, makerAssets, setMakerAssets])

  return {
    requestedAdjustment,
    setRequestedAdjustment,
    offeredAdjustment,
    setOfferedAdjustment,
    originalRequestedAmounts,
    originalOfferedAmounts,
  }
}
