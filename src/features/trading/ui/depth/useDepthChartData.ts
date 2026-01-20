import { useMemo, useState, useEffect, useCallback } from 'react'
import type { MarketDepthData, MarketDepthLevel } from '../../lib/chartTypes'

interface UseDepthChartDataOptions {
  depthData: MarketDepthData
  maxSpreadPercent: number
}

interface ProcessedDepthData {
  priceRange: { min: number; max: number }
  visibleBids: Array<MarketDepthLevel & { cumulativeVolume: number }>
  visibleAsks: Array<MarketDepthLevel & { cumulativeVolume: number }>
  maxVolume: number
  midPrice: number
}

export function useDepthChartData({
  depthData,
  maxSpreadPercent,
}: UseDepthChartDataOptions): ProcessedDepthData {
  // Calculate price range based on max spread from best bid/ask
  // Make the range very tight to show the spread close together
  // Ensure maxSpreadPercent is always greater than current spread
  const priceRange = useMemo(() => {
    if (!depthData.bestBid || !depthData.bestAsk) {
      return { min: 0, max: 1 }
    }

    const midPrice = (depthData.bestBid + depthData.bestAsk) / 2
    const currentSpread = depthData.bestAsk - depthData.bestBid
    const currentSpreadPercent = depthData.spreadPercent
    
    // Ensure maxSpreadPercent is always greater than current spread
    const safeMaxSpreadPercent = Math.max(maxSpreadPercent, currentSpreadPercent + 0.1)
    
    // Calculate max spread amount based on percentage of mid-price
    const maxSpreadAmount = midPrice * (safeMaxSpreadPercent / 100)
    
    // Ensure maxSpreadAmount is greater than currentSpread
    const effectiveMaxSpread = Math.max(maxSpreadAmount, currentSpread * 1.1)
    
    // Calculate extension, but make it much tighter for small spreads
    // For small spreads (< 2%), use minimal extension
    let extension: number
    
    if (currentSpreadPercent < 2) {
      // For very small spreads, use minimal extension (just 20% of the difference)
      extension = (effectiveMaxSpread - currentSpread) * 0.2
    } else {
      // For larger spreads, use normal extension
      extension = (effectiveMaxSpread - currentSpread) / 2
    }
    
    // Use a very small buffer - just enough to show depth
    const buffer = Math.max(currentSpread * 0.05, midPrice * 0.0005) // 5% of spread or 0.05% of mid-price
    
    return {
      min: Math.max(0, depthData.bestBid - extension - buffer),
      max: depthData.bestAsk + extension + buffer,
    }
  }, [depthData.bestBid, depthData.bestAsk, depthData.spreadPercent, maxSpreadPercent])

  // Filter bids and asks to only include those within the spread range
  // Use a small tolerance to ensure best bid/ask are always included
  const filteredBids = useMemo(() => {
    if (!depthData.bestBid) return []
    // Filter bids within range, with a small buffer to ensure best bid is included
    const tolerance = Math.max(0.00000001, (priceRange.max - priceRange.min) * 0.001)
    return depthData.bids.filter(
      (bid) => bid.price >= priceRange.min - tolerance && bid.price <= priceRange.max + tolerance
    )
  }, [depthData.bids, depthData.bestBid, priceRange])

  const filteredAsks = useMemo(() => {
    if (!depthData.bestAsk) return []
    // Filter asks within range, with a small buffer to ensure best ask is included
    const tolerance = Math.max(0.00000001, (priceRange.max - priceRange.min) * 0.001)
    return depthData.asks.filter(
      (ask) => ask.price >= priceRange.min - tolerance && ask.price <= priceRange.max + tolerance
    )
  }, [depthData.asks, depthData.bestAsk, priceRange])

  // Recalculate cumulative volumes for visible bids/asks only
  const visibleBids = useMemo(() => {
    if (filteredBids.length === 0) return []
    
    const sortedBids = [...filteredBids].sort((a, b) => b.price - a.price)
    
    let cumulativeVolume = 0
    return sortedBids.map((bid) => {
      cumulativeVolume += bid.quantity
      return {
        ...bid,
        cumulativeVolume,
      }
    })
  }, [filteredBids])

  const visibleAsks = useMemo(() => {
    if (filteredAsks.length === 0) return []
    
    const sortedAsks = [...filteredAsks].sort((a, b) => a.price - b.price)
    
    let cumulativeVolume = 0
    return sortedAsks.map((ask) => {
      const quantity = ask.quantity || 0
      cumulativeVolume += quantity
      return {
        ...ask,
        quantity,
        cumulativeVolume,
      }
    })
  }, [filteredAsks])

  // Calculate max cumulative volume for Y-axis normalization
  const maxVolume = useMemo(() => {
    const bidMax = visibleBids.length > 0 ? visibleBids[visibleBids.length - 1]?.cumulativeVolume || 0 : 0
    const askMax = visibleAsks.length > 0 ? visibleAsks[visibleAsks.length - 1]?.cumulativeVolume || 0 : 0
    const max = Math.max(bidMax, askMax, 1)
    return isFinite(max) && max > 0 ? max : 1
  }, [visibleBids, visibleAsks])

  // Calculate mid-price and center X position
  const midPrice = useMemo(() => {
    if (depthData.bestBid && depthData.bestAsk) {
      return (depthData.bestBid + depthData.bestAsk) / 2
    }
    return (priceRange.min + priceRange.max) / 2
  }, [depthData.bestBid, depthData.bestAsk, priceRange])

  return {
    priceRange,
    visibleBids,
    visibleAsks,
    maxVolume,
    midPrice,
  }
}

export function useMaxSpreadPercent(depthData: MarketDepthData) {
  const defaultMaxSpread = useMemo(() => {
    if (depthData.bestBid && depthData.bestAsk) {
      const currentSpreadPercent = depthData.spreadPercent
      // Default max spread is current spread plus 5%
      return currentSpreadPercent + 5
    }
    return 1
  }, [depthData.bestBid, depthData.bestAsk, depthData.spreadPercent])
  
  const [maxSpreadPercent, setMaxSpreadPercent] = useState(defaultMaxSpread)
  
  useEffect(() => {
    // Only reset to default if current spread changed significantly
    // Don't reset if user has manually adjusted the value
    const currentSpreadPercent = depthData.spreadPercent
    const minAllowed = currentSpreadPercent + 0.1
    
    // Only adjust if maxSpreadPercent is below minimum or if spread changed significantly
    if (maxSpreadPercent < minAllowed) {
      setMaxSpreadPercent(Math.max(defaultMaxSpread, minAllowed))
    }
    // Don't reset to default if user has manually set a value - only enforce minimum
  }, [defaultMaxSpread, depthData.spreadPercent, maxSpreadPercent])

  // Wrapper function to ensure max spread is always > current spread
  const setMaxSpreadPercentSafe = useCallback((value: number) => {
    const currentSpreadPercent = depthData.spreadPercent
    const minAllowed = currentSpreadPercent + 0.1
    // Only enforce minimum, don't override user's choice if it's valid
    const newValue = Math.max(value, minAllowed)
    setMaxSpreadPercent(newValue)
  }, [depthData.spreadPercent])

  return [maxSpreadPercent, setMaxSpreadPercentSafe] as const
}
