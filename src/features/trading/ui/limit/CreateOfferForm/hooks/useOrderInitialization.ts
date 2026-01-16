import { useEffect, useRef } from 'react'
import type { OrderBookOrder } from '../../../../lib/orderBookTypes'

interface UseOrderInitializationProps {
  order: OrderBookOrder | undefined
  useAsTemplate: (order: OrderBookOrder) => void
  initialPriceAdjustments?: { requested: number; offered: number }
  setRequestedAdjustment: (value: number) => void
  setOfferedAdjustment: (value: number) => void
}

/**
 * Extract order initialization logic to reduce complexity
 */
export function useOrderInitialization({
  order,
  useAsTemplate,
  initialPriceAdjustments,
  setRequestedAdjustment,
  setOfferedAdjustment,
}: UseOrderInitializationProps) {
  const lastOrderIdRef = useRef<string | undefined>(undefined)
  const useAsTemplateRef = useRef(useAsTemplate)
  const setRequestedAdjustmentRef = useRef(setRequestedAdjustment)
  const setOfferedAdjustmentRef = useRef(setOfferedAdjustment)

  // Update refs when callbacks change
  useEffect(() => {
    useAsTemplateRef.current = useAsTemplate
    setRequestedAdjustmentRef.current = setRequestedAdjustment
    setOfferedAdjustmentRef.current = setOfferedAdjustment
  }, [useAsTemplate, setRequestedAdjustment, setOfferedAdjustment])

  useEffect(() => {
    // Only initialize if order ID actually changed
    if (order?.id === lastOrderIdRef.current) {
      return
    }
    lastOrderIdRef.current = order?.id

    if (order) {
      useAsTemplateRef.current(order)
      setRequestedAdjustmentRef.current(initialPriceAdjustments?.requested || 0)
      setOfferedAdjustmentRef.current(initialPriceAdjustments?.offered || 0)
    } else {
      setRequestedAdjustmentRef.current(0)
      setOfferedAdjustmentRef.current(0)
    }
  }, [order, initialPriceAdjustments?.requested, initialPriceAdjustments?.offered])
}
