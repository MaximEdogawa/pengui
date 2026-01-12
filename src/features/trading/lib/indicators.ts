/**
 * Technical Indicators
 * Calculations for SMA, EMA, RSI, MACD, and Bollinger Bands
 */

import type { MACDData, BollingerBandsData, OHLCData } from './chartTypes'

/**
 * Calculate Simple Moving Average (SMA)
 */
export function calculateSMA(data: number[], period: number): number[] {
  if (data.length < period) {
    return []
  }

  const sma: number[] = []
  // eslint-disable-next-line no-restricted-syntax
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
    sma.push(sum / period)
  }

  return sma
}

/**
 * Calculate Exponential Moving Average (EMA)
 */
export function calculateEMA(data: number[], period: number): number[] {
  if (data.length < period) {
    return []
  }

  const ema: number[] = []
  const multiplier = 2 / (period + 1)

  // Start with SMA for the first value
  const firstSMA = data.slice(0, period).reduce((a, b) => a + b, 0) / period
  ema.push(firstSMA)

  // Calculate EMA for remaining values
  // eslint-disable-next-line no-restricted-syntax
  for (let i = period; i < data.length; i++) {
    const currentEMA = (data[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1]
    ema.push(currentEMA)
  }

  return ema
}

/**
 * Calculate Relative Strength Index (RSI)
 */
export function calculateRSI(data: number[], period: number = 14): number[] {
  if (data.length < period + 1) {
    return []
  }

  const rsi: number[] = []
  const gains: number[] = []
  const losses: number[] = []

  // Calculate price changes
  // eslint-disable-next-line no-restricted-syntax
  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1]
    gains.push(change > 0 ? change : 0)
    losses.push(change < 0 ? Math.abs(change) : 0)
  }

  // Calculate initial average gain and loss
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period

  // Calculate RSI for first period
  if (avgLoss === 0) {
    rsi.push(100)
  } else {
    const rs = avgGain / avgLoss
    rsi.push(100 - 100 / (1 + rs))
  }

  // Calculate RSI for remaining periods using Wilder's smoothing
  // eslint-disable-next-line no-restricted-syntax
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period

    if (avgLoss === 0) {
      rsi.push(100)
    } else {
      const rs = avgGain / avgLoss
      rsi.push(100 - 100 / (1 + rs))
    }
  }

  return rsi
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(
  data: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDData[] {
  if (data.length < slowPeriod + signalPeriod) {
    return []
  }

  const fastEMA = calculateEMA(data, fastPeriod)
  const slowEMA = calculateEMA(data, slowPeriod)

  // Calculate MACD line (fast EMA - slow EMA)
  const macdLine: number[] = []
  const offset = slowPeriod - fastPeriod

  // eslint-disable-next-line no-restricted-syntax
  for (let i = 0; i < slowEMA.length; i++) {
    if (i + offset < fastEMA.length) {
      macdLine.push(fastEMA[i + offset] - slowEMA[i])
    }
  }

  // Calculate signal line (EMA of MACD line)
  const signalLine = calculateEMA(macdLine, signalPeriod)

  // Calculate histogram (MACD - Signal)
  const macdData: MACDData[] = []
  const signalOffset = macdLine.length - signalLine.length

  // eslint-disable-next-line no-restricted-syntax
  for (let i = 0; i < signalLine.length; i++) {
    const macd = macdLine[i + signalOffset]
    const signal = signalLine[i]
    macdData.push({
      time: 0, // Will be set by caller
      value: macd,
      macd,
      signal,
      histogram: macd - signal,
    })
  }

  return macdData
}

/**
 * Calculate Bollinger Bands
 */
export function calculateBollingerBands(
  data: number[],
  period: number = 20,
  stdDev: number = 2
): BollingerBandsData[] {
  if (data.length < period) {
    return []
  }

  const sma = calculateSMA(data, period)
  const bands: BollingerBandsData[] = []

  // eslint-disable-next-line no-restricted-syntax
  for (let i = 0; i < sma.length; i++) {
    const startIdx = i
    const endIdx = i + period
    const slice = data.slice(startIdx, endIdx)

    // Calculate standard deviation
    const mean = sma[i]
    const variance =
      slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period
    const standardDeviation = Math.sqrt(variance)

    bands.push({
      time: 0, // Will be set by caller
      value: mean,
      upper: mean + stdDev * standardDeviation,
      middle: mean,
      lower: mean - stdDev * standardDeviation,
    })
  }

  return bands
}

/**
 * Calculate indicators from OHLC data
 */
export function calculateIndicatorsFromOHLC(
  ohlcData: OHLCData[],
  config: {
    sma?: number[]
    ema?: number[]
    rsi?: boolean
    macd?: boolean
    bollingerBands?: boolean
  }
): {
  sma: Record<number, number[]>
  ema: Record<number, number[]>
  rsi: number[]
  macd: MACDData[]
  bollingerBands: BollingerBandsData[]
} {
  const closes = ohlcData.map((c) => c.close)
  const times = ohlcData.map((c) => c.time)

  const result: {
    sma: Record<number, number[]>
    ema: Record<number, number[]>
    rsi: number[]
    macd: MACDData[]
    bollingerBands: BollingerBandsData[]
  } = {
    sma: {},
    ema: {},
    rsi: [],
    macd: [],
    bollingerBands: [],
  }

  // Calculate SMA
  if (config.sma) {
    for (const period of config.sma) {
      const smaValues = calculateSMA(closes, period)
      // Align with original data (SMA starts after period)
      result.sma[period] = new Array(period - 1).fill(NaN).concat(smaValues)
    }
  }

  // Calculate EMA
  if (config.ema) {
    for (const period of config.ema) {
      const emaValues = calculateEMA(closes, period)
      // Align with original data (EMA starts after period)
      result.ema[period] = new Array(period - 1).fill(NaN).concat(emaValues)
    }
  }

  // Calculate RSI
  if (config.rsi) {
    const rsiValues = calculateRSI(closes)
    // Align with original data (RSI starts after period + 1)
    result.rsi = new Array(15).fill(NaN).concat(rsiValues)
  }

  // Calculate MACD
  if (config.macd) {
    const macdData = calculateMACD(closes)
    // Set times from OHLC data
    const macdOffset = closes.length - macdData.length
    macdData.forEach((macd, idx) => {
      macd.time = times[idx + macdOffset] || 0
    })
    // Align with original data
    result.macd = new Array(closes.length - macdData.length)
      .fill(null)
      .map(() => ({
        time: 0,
        value: NaN,
        macd: NaN,
        signal: NaN,
        histogram: NaN,
      }))
      .concat(macdData)
  }

  // Calculate Bollinger Bands
  if (config.bollingerBands) {
    const bands = calculateBollingerBands(closes)
    // Set times from OHLC data
    bands.forEach((band, idx) => {
      band.time = times[idx + 19] || 0 // period - 1 offset
    })
    // Align with original data
    result.bollingerBands = new Array(19)
      .fill(null)
      .map(() => ({
        time: 0,
        value: NaN,
        upper: NaN,
        middle: NaN,
        lower: NaN,
      }))
      .concat(bands)
  }

  return result
}
