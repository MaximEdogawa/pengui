import { useEffect, useState } from 'react'

/**
 * Hook to detect screen size and determine if mobile or desktop
 * Uses Tailwind's lg breakpoint (1024px)
 * - sm and md (< 1024px): Mobile view (order book only, modal on click)
 * - lg and above (>= 1024px): Desktop view (order book + take offer tab)
 */
export function useResponsive() {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    // Set initial value
    const checkScreenSize = () => {
      const width = window.innerWidth
      // Mobile: < 1024px (sm and md breakpoints)
      setIsMobile(width < 1024) // lg breakpoint
      // Tablet: 768px - 1023px (md breakpoint range)
      setIsTablet(width >= 768 && width < 1024)
    }

    // Check on mount
    checkScreenSize()

    // Listen for resize events
    window.addEventListener('resize', checkScreenSize)

    return () => {
      window.removeEventListener('resize', checkScreenSize)
    }
  }, [])

  return {
    isMobile, // < 1024px (sm and md)
    isTablet, // 768px - 1023px (md)
    isDesktop: !isMobile, // >= 1024px (lg and above)
  }
}
