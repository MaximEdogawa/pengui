import { useMemo, useEffect, useRef } from 'react'
import type { OrderBookOrder } from '../../../../lib/orderBookTypes'

interface AssetItem {
  assetId: string
  amount: number
  type: 'xch' | 'cat' | 'nft'
  symbol: string
  searchQuery?: string
  showDropdown?: boolean
}

interface UseAssetAdjustmentsProps {
  order: OrderBookOrder | undefined
  makerAssets: AssetItem[]
  takerAssets: AssetItem[]
  requestedAdjustment: number
  offeredAdjustment: number
  manuallyEdited: { requested: Set<number>; offered: Set<number> }
  baseAmounts: { requested: number[]; offered: number[] }
  setBaseAmounts: React.Dispatch<React.SetStateAction<{ requested: number[]; offered: number[] }>>
  setManuallyEdited: React.Dispatch<
    React.SetStateAction<{
      requested: Set<number>
      offered: Set<number>
    }>
  >
}

/**
 * Extract asset adjustment logic to reduce complexity
 */
export function useAssetAdjustments({
  order,
  makerAssets,
  takerAssets,
  requestedAdjustment,
  offeredAdjustment,
  manuallyEdited,
  baseAmounts,
  setBaseAmounts,
  setManuallyEdited,
}: UseAssetAdjustmentsProps) {
  // Base amounts (from order or when slider was last at 0)
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
  }, [order])

  const prevOrderIdRef = useRef<string | undefined>(undefined)
  const prevTakerLengthRef = useRef(takerAssets.length)
  const prevMakerLengthRef = useRef(makerAssets.length)

  // Update base amounts when order changes
  useEffect(() => {
    const currentOrderId = order?.id
    const orderChanged = prevOrderIdRef.current !== currentOrderId

    if (!orderChanged) {
      return
    }

    if (order) {
      setBaseAmounts(baseAmountsFromOrder)
      setManuallyEdited({ requested: new Set(), offered: new Set() })
      prevOrderIdRef.current = currentOrderId
    } else {
      setBaseAmounts({ requested: [], offered: [] })
      setManuallyEdited({ requested: new Set(), offered: new Set() })
      prevOrderIdRef.current = undefined
    }
  }, [order, baseAmountsFromOrder, setBaseAmounts, setManuallyEdited])

  // Update base amounts when manually adding assets (no order)
  useEffect(() => {
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
  }, [takerAssets, order, setBaseAmounts])

  useEffect(() => {
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
  }, [makerAssets, order, setBaseAmounts])

  // Calculate adjusted assets
  const adjustedTakerAssets = useMemo(() => {
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
  }, [order, baseAmounts.requested, takerAssets, manuallyEdited.requested, requestedAdjustment])

  const adjustedMakerAssets = useMemo(() => {
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
  }, [order, baseAmounts.offered, makerAssets, manuallyEdited.offered, offeredAdjustment])

  return {
    adjustedTakerAssets,
    adjustedMakerAssets,
    baseAmountsFromOrder,
  }
}
