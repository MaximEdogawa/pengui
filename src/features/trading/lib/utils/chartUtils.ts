import type { DexieHistoricalTrade } from '@/features/offers/lib/dexieTypes'
import type { OrderBookOrder } from '../orderBookTypes'
import type {
  OHLCData,
  OrderBookChartData,
  PriceDataPoint,
  Timeframe,
  VolumeDataPoint,
} from '../chartTypes'

function toSeconds(timestamp: number): number {
  return Math.floor(timestamp / 1000)
}

function getTimeframeDurationMs(timeframe: Timeframe): number {
  const durations: Record<Timeframe, number> = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1D': 24 * 60 * 60 * 1000,
    '1W': 7 * 24 * 60 * 60 * 1000,
    '1M': 30 * 24 * 60 * 60 * 1000,
  }
  return durations[timeframe]
}

function getCandleStartTime(timestamp: number, timeframe: Timeframe): number {
  const duration = getTimeframeDurationMs(timeframe)
  return Math.floor(timestamp / duration) * duration
}
export function aggregateTradesToOHLC(
  trades: DexieHistoricalTrade[] | null | undefined,
  timeframe: Timeframe
): OHLCData[] {
  if (!trades || !Array.isArray(trades) || trades.length === 0) {
    return []
  }

  const validTrades = trades.filter(
    (trade) =>
      trade &&
      typeof trade === 'object' &&
      typeof trade.timestamp === 'number' &&
      typeof trade.price === 'number' &&
      typeof trade.volume === 'number' &&
      !isNaN(trade.timestamp) &&
      !isNaN(trade.price) &&
      !isNaN(trade.volume)
  )

  if (validTrades.length === 0) {
    return []
  }

  const sortedTrades = [...validTrades].sort((a, b) => a.timestamp - b.timestamp)
  const candlesMap = sortedTrades.reduce((map, trade) => {
    const tradeTime = trade.timestamp < 10000000000 ? trade.timestamp * 1000 : trade.timestamp
    const candleStart = getCandleStartTime(tradeTime, timeframe)
    
    if (!map.has(candleStart)) {
      map.set(candleStart, [])
    }
    map.get(candleStart)!.push(trade)
    return map
  }, new Map<number, DexieHistoricalTrade[]>())

  const candles = Array.from(candlesMap.entries())
    .filter(([, trades]) => trades.length > 0)
    .map(([candleStart, candleTrades]) => ({
      time: toSeconds(candleStart),
      open: candleTrades[0].price,
      high: Math.max(...candleTrades.map((t) => t.price)),
      low: Math.min(...candleTrades.map((t) => t.price)),
      close: candleTrades[candleTrades.length - 1].price,
      volume: candleTrades.reduce((sum, t) => sum + t.volume, 0),
    }))

  return candles.sort((a, b) => a.time - b.time)
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

