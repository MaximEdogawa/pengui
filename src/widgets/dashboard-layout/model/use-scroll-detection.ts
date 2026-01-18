import { useEffect, useState } from 'react'

/**
 * Extract scroll detection logic to reduce DashboardLayout size
 */
export function useScrollDetection(mounted: boolean) {
  const [isScrolling, setIsScrolling] = useState(false)

  useEffect(() => {
    const mainElement = document.querySelector('main')
    if (!mainElement) return

    let scrollTimeout: NodeJS.Timeout
    const handleScroll = () => {
      setIsScrolling(true)
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        setIsScrolling(false)
      }, 1000) // Hide scrollbar 1 second after scrolling stops
    }

    mainElement.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      mainElement.removeEventListener('scroll', handleScroll)
      clearTimeout(scrollTimeout)
    }
  }, [mounted])

  return isScrolling
}
