import { useEffect, useRef } from 'react'

interface UseOrderBookScrollOptions {
  sellScrollRef: React.RefObject<HTMLDivElement | null>
  buyScrollRef: React.RefObject<HTMLDivElement | null>
  filteredSellOrders: unknown[]
  orderBookLoading: boolean
  orderBookHasMore: boolean
  onLoadMore?: () => void
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
  onLoadMore,
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
    if (!buyScrollRef.current || !onLoadMore) return

    // Create sentinel element at the end of buy orders list
    const sentinel = document.createElement('div')
    sentinel.style.height = '1px'
    sentinel.style.width = '100%'
    sentinel.setAttribute('data-sentinel', 'true')
    
    // Insert sentinel at the end of the buy scroll container
    buyScrollRef.current.appendChild(sentinel)

    let isLoadingMore = false

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting && orderBookHasMore && !orderBookLoading && !isLoadingMore) {
          isLoadingMore = true
          onLoadMore()
          // Reset loading flag after a short delay to allow for debouncing
          setTimeout(() => {
            isLoadingMore = false
          }, 1000)
        }
      },
      { threshold: 0.1, root: buyScrollRef.current }
    )

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
      // Remove sentinel on cleanup
      if (sentinel.parentNode) {
        sentinel.parentNode.removeChild(sentinel)
      }
    }
  }, [orderBookHasMore, orderBookLoading, buyScrollRef, onLoadMore])
}
