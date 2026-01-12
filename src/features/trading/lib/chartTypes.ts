/**
 * Chart Types
 * Type definitions for the price chart feature
 */

/**
 * Supported chart types - Only Candles and Line
 */
export type ChartType = 'candlestick' | 'line'

/**
 * Supported timeframes
 */
export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1D' | '1W' | '1M'

/**
 * OHLC (Open, High, Low, Close) candle data
 */
export interface OHLCData {
  time: number // Unix timestamp in seconds
  open: number
  high: number
  low: number
  close: number
  volume: number
}

/**
 * Price data point for line charts
 */
export interface PriceDataPoint {
  time: number // Unix timestamp in seconds
  value: number
}

/**
 * Volume data point
 */
export interface VolumeDataPoint {
  time: number // Unix timestamp in seconds
  value: number
  color?: string // Optional color for volume bars
}

/**
 * Order book data for chart overlay
 */
export interface OrderBookChartData {
  bids: Array<{ price: number; volume: number }>
  asks: Array<{ price: number; volume: number }>
  spread: number
  bestBid: number | null
  bestAsk: number | null
}

/**
 * Technical indicator data
 */
export type IndicatorData = {
  time: number
  value: number
}

/**
 * MACD data
 */
export interface MACDData extends IndicatorData {
  macd: number
  signal: number
  histogram: number
}

/**
 * Bollinger Bands data
 */
export interface BollingerBandsData extends IndicatorData {
  upper: number
  middle: number
  lower: number
}

/**
 * Chart configuration
 */
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
