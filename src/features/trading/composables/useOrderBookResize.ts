import { useCallback, useState } from 'react'

export function useOrderBookResize() {
  const [sellSectionHeight, setSellSectionHeight] = useState(50)
  const [buySectionHeight, setBuySectionHeight] = useState(50)

  const startResize = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      const startY = event.clientY
      const startSellHeight = sellSectionHeight
      const containerElement = document.querySelector('.order-book-container')
      const containerHeight = containerElement?.clientHeight || 400

      const handleMouseMove = (e: MouseEvent) => {
        const deltaY = e.clientY - startY
        const deltaPercent = (deltaY / containerHeight) * 100
        const newSellHeight = Math.max(20, Math.min(80, startSellHeight + deltaPercent))
        const newBuyHeight = 100 - newSellHeight

        setSellSectionHeight(newSellHeight)
        setBuySectionHeight(newBuyHeight)
      }

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [sellSectionHeight]
  )

  return {
    sellSectionHeight,
    buySectionHeight,
    startResize,
  }
}
