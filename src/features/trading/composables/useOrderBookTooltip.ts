import { useCallback, useState } from 'react'
import type { OrderBookOrder } from '../lib/orderBookTypes'

export function useOrderBookTooltip() {
  const [hoveredOrder, setHoveredOrder] = useState<OrderBookOrder | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [tooltipVisible, setTooltipVisible] = useState(false)

  const updateTooltipPosition = useCallback(
    (event: React.MouseEvent, order: OrderBookOrder, _orderType: 'buy' | 'sell') => {
      setHoveredOrder(order)
      setTooltipPosition({ x: event.clientX, y: event.clientY })
      setTooltipVisible(true)
    },
    []
  )

  const hideTooltip = useCallback(() => {
    setTooltipVisible(false)
    setHoveredOrder(null)
  }, [])

  return {
    hoveredOrder,
    tooltipPosition,
    tooltipVisible,
    updateTooltipPosition,
    hideTooltip,
  }
}
