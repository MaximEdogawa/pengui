import { useEffect, useRef } from 'react'

interface UseOrderBookScrollOptions {
  sellScrollRef: React.RefObject<HTMLDivElement | null>
  buyScrollRef: React.RefObject<HTMLDivElement | null>
  filteredSellOrders: unknown[]
  orderBookLoading: boolean
  orderBookHasMore: boolean
}

/**
 * Manages scroll behavior for order book sections
 * - Tracks user scroll position
 * - Auto-scrolls to bottom on initial load
 * - Restores scroll position when user has manually scrolled
 */
export function useOrderBookScroll({
  sellScrollRef,
  buyScrollRef,
  filteredSellOrders,
  orderBookLoading,
  orderBookHasMore,
}: UseOrderBookScrollOptions) {
  // Track if user has manually scrolled away from bottom
  const hasUserScrolledRef = useRef(false)
  // Store scroll position to restore after updates
  const savedScrollPositionRef = useRef<number | null>(null)
  // Track if this is the initial load
  const isInitialLoadRef = useRef(true)

  // Track user scroll to detect manual scrolling
  useEffect(() => {
    const sellScrollElement = sellScrollRef.current
    if (!sellScrollElement) return

    const handleScroll = () => {
      if (!sellScrollElement) return
      
      const { scrollTop, scrollHeight, clientHeight } = sellScrollElement
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 5 // 5px threshold for rounding
      
      // If user scrolls away from bottom, mark as manually scrolled
      if (!isAtBottom) {
        hasUserScrolledRef.current = true
        savedScrollPositionRef.current = scrollTop
      } else {
        // If user scrolls back to bottom, allow auto-scroll again
        hasUserScrolledRef.current = false
        savedScrollPositionRef.current = null
      }
    }

    sellScrollElement.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      sellScrollElement.removeEventListener('scroll', handleScroll)
    }
  }, [sellScrollRef])

  // Scroll sell side to bottom by default when orders load or change
  // Only auto-scroll if user hasn't manually scrolled away from bottom
  useEffect(() => {
    if (sellScrollRef.current && filteredSellOrders.length > 0 && !orderBookLoading) {
      // Use requestAnimationFrame to ensure DOM is fully updated
      requestAnimationFrame(() => {
        if (!sellScrollRef.current) return
        
        // On initial load, always scroll to bottom
        if (isInitialLoadRef.current) {
          sellScrollRef.current.scrollTop = sellScrollRef.current.scrollHeight
          isInitialLoadRef.current = false
          return
        }
        
        // If user has manually scrolled, restore their position
        if (hasUserScrolledRef.current && savedScrollPositionRef.current !== null) {
          sellScrollRef.current.scrollTop = savedScrollPositionRef.current
        } else {
          // Otherwise, scroll to bottom (user is at bottom or hasn't scrolled)
          sellScrollRef.current.scrollTop = sellScrollRef.current.scrollHeight
        }
      })
    }
  }, [filteredSellOrders, orderBookLoading, sellScrollRef])

  // Intersection Observer for infinite scrolling
  useEffect(() => {
    if (!buyScrollRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && orderBookHasMore && !orderBookLoading) {
          // Load more would be handled by parent component
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(buyScrollRef.current)

    return () => {
      observer.disconnect()
    }
  }, [orderBookHasMore, orderBookLoading, buyScrollRef])
}
