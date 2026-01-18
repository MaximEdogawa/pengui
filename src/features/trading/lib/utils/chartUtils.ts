import type { DexieHistoricalTrade } from '@/features/offers/lib/dexieTypes'
import type { OrderBookOrder } from '../orderBookTypes'
import type {
  OHLCData,
  OrderBookChartData,
  PriceDataPoint,
  Timeframe,
  VolumeDataPoint,
} from '../chartTypes'
import { logger } from '@/shared/lib/logger'

function toSeconds(timestamp: number): number {
  return Math.floor(timestamp / 1000)
}

function getTimeframeDurationMs(timeframe: Timeframe): number {
  const durations: Record<Timeframe, number> = {
    '1m': 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1D': 24 * 60 * 60 * 1000,
    '1W': 7 * 24 * 60 * 60 * 1000,
    '1M': 30 * 24 * 60 * 60 * 1000, // Not used for monthly, but kept for other calculations
  }
  return durations[timeframe]
}

function getCandleStartTime(timestamp: number, timeframe: Timeframe): number {
  // For monthly candles, use actual calendar month boundaries
  if (timeframe === '1M') {
    const date = new Date(timestamp)
    // Set to the first day of the month at 00:00:00 UTC
    const monthStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0))
    return monthStart.getTime()
  }
  
  // For weekly candles, use Monday as the start of the week
  if (timeframe === '1W') {
    const date = new Date(timestamp)
    const dayOfWeek = date.getUTCDay() // 0 = Sunday, 1 = Monday, etc.
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Convert to days from Monday
    const weekStart = new Date(date)
    weekStart.setUTCDate(date.getUTCDate() - daysToMonday)
    weekStart.setUTCHours(0, 0, 0, 0)
    return weekStart.getTime()
  }
  
  // For daily candles, use midnight UTC
  if (timeframe === '1D') {
    const date = new Date(timestamp)
    const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0))
    return dayStart.getTime()
  }
  
  // For all other timeframes, use fixed duration buckets
  const duration = getTimeframeDurationMs(timeframe)
  return Math.floor(timestamp / duration) * duration
}

function isValidTrade(trade: unknown): trade is DexieHistoricalTrade {
  if (!trade || typeof trade !== 'object') return false
  
  const t = trade as Record<string, unknown>
  
  // Check for price (required) - can be number or string that can be parsed to number
  const price = t.price
  const priceNum = typeof price === 'number' ? price : typeof price === 'string' ? parseFloat(price) : NaN
  if (!('price' in t) || isNaN(priceNum)) {
    return false
  }
  
  // Check for timestamp (either timestamp or trade_timestamp) - can be number or string
  const timestamp = t.timestamp
  const tradeTimestamp = t.trade_timestamp
  const timestampNum = typeof timestamp === 'number' ? timestamp : typeof timestamp === 'string' ? parseFloat(timestamp) : NaN
  const tradeTimestampNum = typeof tradeTimestamp === 'number' ? tradeTimestamp : typeof tradeTimestamp === 'string' ? parseFloat(tradeTimestamp as string) : NaN
  
  const hasTimestamp = (!isNaN(timestampNum) && timestampNum > 0) || (!isNaN(tradeTimestampNum) && tradeTimestampNum > 0)
  
  if (!hasTimestamp) {
    return false
  }
  
  // Check for volume (either volume, base_volume, or target_volume) - can be number or string
  const volume = t.volume
  const baseVolume = t.base_volume
  const targetVolume = t.target_volume
  
  const volumeNum = typeof volume === 'number' ? volume : typeof volume === 'string' ? parseFloat(volume) : NaN
  const baseVolumeNum = typeof baseVolume === 'number' ? baseVolume : typeof baseVolume === 'string' ? parseFloat(baseVolume as string) : NaN
  const targetVolumeNum = typeof targetVolume === 'number' ? targetVolume : typeof targetVolume === 'string' ? parseFloat(targetVolume as string) : NaN
  
  const hasVolume = (!isNaN(volumeNum) && volumeNum > 0) || (!isNaN(baseVolumeNum) && baseVolumeNum > 0) || (!isNaN(targetVolumeNum) && targetVolumeNum > 0)
  
  return hasVolume
}

/**
 * Validates and normalizes OHLC data to ensure it matches the expected structure
 */
export function normalizeOHLCData(data: unknown[]): OHLCData[] {
  if (!Array.isArray(data) || data.length === 0) {
    return []
  }

  return data
    .map((item) => {
      // If it's already in the correct format, return as-is
      if (
        item &&
        typeof item === 'object' &&
        'time' in item &&
        'open' in item &&
        'high' in item &&
        'low' in item &&
        'close' in item &&
        'volume' in item
      ) {
        const candle = item as OHLCData
        // Ensure time is in seconds (Unix timestamp)
        const time = typeof candle.time === 'number' 
          ? (candle.time < 10000000000 ? candle.time : Math.floor(candle.time / 1000))
          : 0
        
        return {
          time,
          open: Number(candle.open) || 0,
          high: Number(candle.high) || 0,
          low: Number(candle.low) || 0,
          close: Number(candle.close) || 0,
          volume: Number(candle.volume) || 0,
        }
      }
      return null
    })
    .filter((candle): candle is OHLCData => candle !== null && candle.time > 0)
}

function logInvalidTrades(trades: DexieHistoricalTrade[]) {
  if (trades.length === 0) return
  
  const sample = trades[0] as unknown as Record<string, unknown>
  logger.error('No valid trades found after filtering', {
    totalTrades: trades.length,
    sampleTrade: {
      keys: Object.keys(sample),
      trade_id: sample.trade_id,
      price: sample.price,
      trade_timestamp: sample.trade_timestamp,
      timestamp: sample.timestamp,
      base_volume: sample.base_volume,
      volume: sample.volume,
      target_volume: sample.target_volume,
      type: sample.type,
    },
    validationChecks: {
      hasPrice: 'price' in sample && (typeof sample.price === 'number' || (typeof sample.price === 'string' && !isNaN(parseFloat(sample.price)))),
      hasTimestamp: ('timestamp' in sample && (typeof sample.timestamp === 'number' || (typeof sample.timestamp === 'string' && !isNaN(parseFloat(sample.timestamp as string))))) ||
                    ('trade_timestamp' in sample && (typeof sample.trade_timestamp === 'number' || (typeof sample.trade_timestamp === 'string' && !isNaN(parseFloat(sample.trade_timestamp as string))))),
      hasVolume: ('volume' in sample && (typeof sample.volume === 'number' || (typeof sample.volume === 'string' && !isNaN(parseFloat(sample.volume as string))))) ||
                 ('base_volume' in sample && (typeof sample.base_volume === 'number' || (typeof sample.base_volume === 'string' && !isNaN(parseFloat(sample.base_volume as string))))) ||
                 ('target_volume' in sample && (typeof sample.target_volume === 'number' || (typeof sample.target_volume === 'string' && !isNaN(parseFloat(sample.target_volume as string))))),
    },
  })
}

function toNumber(val: unknown): number {
  if (typeof val === 'number') return val
  if (typeof val === 'string') {
    const parsed = parseFloat(val)
    return isNaN(parsed) ? 0 : parsed
  }
  return 0
}

function normalizeTrade(trade: DexieHistoricalTrade, index: number) {
  // Get timestamp (prefer trade_timestamp, fallback to timestamp)
  const timestamp = trade.trade_timestamp ?? trade.timestamp ?? 0
  const timestampNum = toNumber(timestamp)
  
  // Get volume (prefer base_volume, then volume, fallback to target_volume)
  const volume = trade.base_volume ?? trade.volume ?? trade.target_volume ?? 0
  const volumeNum = toNumber(volume)
  
  // Get price (ensure it's a number)
  const priceNum = toNumber(trade.price)
  
  const normalized = {
    ...trade,
    timestamp: timestampNum,
    volume: volumeNum,
    price: priceNum,
  }
  
  return normalized
}

function createCandlesFromTrades(
  normalizedTrades: Array<ReturnType<typeof normalizeTrade>>,
  timeframe: Timeframe
): OHLCData[] {
  const sortedTrades = [...normalizedTrades].sort((a, b) => a.timestamp - b.timestamp)
  const candlesMap = sortedTrades.reduce((map, trade) => {
    // Handle timestamp: if < 10000000000, it's in seconds, otherwise milliseconds
    const tradeTime = trade.timestamp < 10000000000 ? trade.timestamp * 1000 : trade.timestamp
    const candleStart = getCandleStartTime(tradeTime, timeframe)
    
    if (!map.has(candleStart)) {
      map.set(candleStart, [])
    }
    map.get(candleStart)!.push(trade)
    return map
  }, new Map<number, typeof normalizedTrades[0][]>())

  return Array.from(candlesMap.entries())
    .filter(([, trades]) => trades.length > 0)
    .map(([candleStart, candleTrades]) => ({
      time: toSeconds(candleStart),
      open: candleTrades[0].price,
      high: Math.max(...candleTrades.map((t) => t.price)),
      low: Math.min(...candleTrades.map((t) => t.price)),
      close: candleTrades[candleTrades.length - 1].price,
      volume: candleTrades.reduce((sum, t) => sum + (t.volume || 0), 0),
    }))
    .sort((a, b) => a.time - b.time)
}

export function aggregateTradesToOHLC(
  trades: DexieHistoricalTrade[] | null | undefined,
  timeframe: Timeframe
): OHLCData[] {
  if (!trades || !Array.isArray(trades) || trades.length === 0) {
    return []
  }

  const validTrades = trades.filter(isValidTrade)
  if (validTrades.length === 0) {
    logInvalidTrades(trades)
    return []
  }

  // Normalize trades to have consistent field names and convert strings to numbers
  const normalizedTrades = validTrades.map((trade, index) => normalizeTrade(trade, index))

  const sortedCandles = createCandlesFromTrades(normalizedTrades, timeframe)
  
  // Log aggregation summary
  logger.info('Trade aggregation summary', {
    inputTrades: trades.length,
    validTrades: validTrades.length,
    normalizedTrades: normalizedTrades.length,
    outputCandles: sortedCandles.length,
    timeframe,
    tradesPerCandle: validTrades.length > 0 ? (validTrades.length / sortedCandles.length).toFixed(2) : 0,
    firstCandleTime: sortedCandles[0]?.time,
    lastCandleTime: sortedCandles[sortedCandles.length - 1]?.time,
    dateRange: sortedCandles.length > 0 ? {
      from: new Date(sortedCandles[0].time * 1000).toISOString(),
      to: new Date(sortedCandles[sortedCandles.length - 1].time * 1000).toISOString(),
    } : null,
  })
  
  return sortedCandles
}

export function ohlcToPricePoints(ohlcData: OHLCData[]): PriceDataPoint[] {
  return ohlcData.map((candle) => ({
    time: candle.time,
    value: candle.close,
  }))
}

export function ohlcToVolumePoints(ohlcData: OHLCData[]): VolumeDataPoint[] {
  return ohlcData.map((candle) => ({
    time: candle.time,
    value: candle.volume,
    color: candle.close >= candle.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)',
  }))
}

export function transformOrderBookForChart(
  orders: OrderBookOrder[],
  filters?: { buyAsset?: string[]; sellAsset?: string[] }
): OrderBookChartData {
  if (orders.length === 0) {
    return {
      bids: [],
      asks: [],
      spread: 0,
      bestBid: null,
      bestAsk: null,
    }
  }

  const nativeTicker = filters?.buyAsset?.find(a => a === 'XCH' || a === 'TXCH') ||
    filters?.sellAsset?.find(a => a === 'XCH' || a === 'TXCH') ||
    'XCH'

  const isNativeAsset = (code: string | undefined) => 
    !code || code === nativeTicker || code === 'TXCH' || code === 'XCH'

  const { bids, asks } = orders.reduce((acc, order) => {
    if (order.offering.length === 0 || order.requesting.length === 0) return acc

    const requestingAmount = order.requesting[0]?.amount || 0
    const offeringAmount = order.offering[0]?.amount || 0
    if (offeringAmount === 0) return acc

    const price = requestingAmount / offeringAmount
    const volume = offeringAmount
    const entry = { price, volume }

    const isSellOrder = order.offering.some(a => isNativeAsset(a.code))
    const isBuyOrder = order.requesting.some(a => isNativeAsset(a.code))

    if (isSellOrder) {
      acc.asks.push(entry)
    } else if (isBuyOrder) {
      acc.bids.push(entry)
    } else if (filters?.buyAsset && filters?.sellAsset) {
      const avgPrice = orders.reduce((sum, o) => {
        const req = o.requesting[0]?.amount || 0
        const off = o.offering[0]?.amount || 0
        return sum + (off > 0 ? req / off : 0)
      }, 0) / orders.length

      if (price < avgPrice) {
        acc.asks.push(entry)
      } else {
        acc.bids.push(entry)
      }
    } else if (order.pricePerUnit > 0) {
      acc.bids.push({ price: order.pricePerUnit, volume })
    }

    return acc
  }, { bids: [] as Array<{ price: number; volume: number }>, asks: [] as Array<{ price: number; volume: number }> })

  bids.sort((a, b) => b.price - a.price)
  asks.sort((a, b) => a.price - b.price)

  const bestBid = bids[0]?.price ?? null
  const bestAsk = asks[0]?.price ?? null

  return {
    bids,
    asks,
    spread: bestBid && bestAsk ? bestAsk - bestBid : 0,
    bestBid,
    bestAsk,
  }
}

export function generateSyntheticOHLCFromOrderBook(
  orderBookData: OrderBookChartData,
  timeframe: Timeframe
): OHLCData[] {
  if (!orderBookData.bestBid || !orderBookData.bestAsk) {
    return []
  }

  const midPrice = (orderBookData.bestBid + orderBookData.bestAsk) / 2
  const totalVolume = 
    orderBookData.bids.reduce((sum, b) => sum + b.volume, 0) +
    orderBookData.asks.reduce((sum, a) => sum + a.volume, 0)

  const now = Date.now()
  const timeframeMs = getTimeframeDurationMs(timeframe)
  const numCandles = Math.min(10, Math.max(5, Math.floor((24 * 60 * 60 * 1000) / timeframeMs)))
  
  const candles = Array.from({ length: numCandles }, (_, index) => {
    const i = numCandles - 1 - index
    const candleTime = now - (i * timeframeMs)
    const candleStart = getCandleStartTime(candleTime, timeframe)
    const priceVariation = (numCandles - i) * 0.001
    const candlePrice = midPrice * (1 + (Math.random() - 0.5) * priceVariation)
    const randomVariation = Math.abs(Math.random() * 0.002)
    
    return {
      time: toSeconds(candleStart),
      open: candlePrice,
      high: Math.max(candlePrice * (1 + randomVariation), midPrice * 1.001),
      low: Math.min(candlePrice * (1 - randomVariation), midPrice * 0.999),
      close: midPrice,
      volume: totalVolume / numCandles,
    }
  })
  
  if (candles.length > 0) {
    const lastCandle = candles[candles.length - 1]
    lastCandle.close = midPrice
    lastCandle.high = Math.max(lastCandle.high, orderBookData.bestAsk ?? midPrice)
    lastCandle.low = Math.min(lastCandle.low, orderBookData.bestBid ?? midPrice)
  }
  
  return candles
}
