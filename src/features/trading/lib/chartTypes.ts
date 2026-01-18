export type ChartType = 'candlestick' | 'line'

export type Timeframe = '1m' | '15m' | '1h' | '4h' | '1D' | '1W' | '1M'

export interface OHLCData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface PriceDataPoint {
  time: number
  value: number
}

export interface VolumeDataPoint {
  time: number
  value: number
  color?: string
}

export interface OrderBookChartData {
  bids: Array<{ price: number; volume: number }>
  asks: Array<{ price: number; volume: number }>
  spread: number
  bestBid: number | null
  bestAsk: number | null
}

export interface ChartConfig {
  chartType: ChartType
  timeframe: Timeframe
  indicators: {
    sma: { enabled: boolean; periods: number[] }
    ema: { enabled: boolean; periods: number[] }
    volume: boolean
    rsi: boolean
    macd: boolean
    bollingerBands: boolean
  }
}
