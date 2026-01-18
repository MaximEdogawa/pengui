import type { OHLCData } from './chartTypes'

export function calculateSMA(data: number[], period: number): number[] {
  if (data.length < period) return []

  const sma = Array.from({ length: data.length - period + 1 }, (_, i) => {
    const slice = data.slice(i, i + period)
    return slice.reduce((sum, val) => sum + val, 0) / period
  })

  return Array(period - 1).fill(NaN).concat(sma)
}

export function calculateEMA(data: number[], period: number): number[] {
  if (data.length < period) return []

  const multiplier = 2 / (period + 1)
  const initialSMA = data.slice(0, period).reduce((sum, val) => sum + val, 0) / period

  const ema = data.slice(period).reduce(
    (acc, value) => {
      const prevEMA = acc[acc.length - 1]
      acc.push((value - prevEMA) * multiplier + prevEMA)
      return acc
    },
    [initialSMA]
  )

  return Array(period - 1).fill(NaN).concat(ema)
}

export function calculateRSI(data: number[], period: number = 14): number[] {
  if (data.length < period + 1) return []

  const changes = data.slice(1).map((val, i) => val - data[i])
  const gains = changes.map(change => change > 0 ? change : 0)
  const losses = changes.map(change => change < 0 ? -change : 0)

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period

  const calculateRSIValue = (gain: number, loss: number) => {
    // Handle neutral case: both gain and loss are zero
    if (gain === 0 && loss === 0) return 50
    // If loss is zero but gain is not, RSI is 100
    if (loss === 0) return 100
    const rs = gain / loss
    return 100 - (100 / (1 + rs))
  }

  const rsi = [calculateRSIValue(avgGain, avgLoss)]

  gains.slice(period).forEach((gain, i) => {
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + losses[period + i]) / period
    rsi.push(calculateRSIValue(avgGain, avgLoss))
  })

  return Array(period).fill(NaN).concat(rsi)
}

export function calculateMACD(
  data: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): Array<{ time: number; macd: number; signal: number; histogram: number }> {
  const fastEMA = calculateEMA(data, fastPeriod)
  const slowEMA = calculateEMA(data, slowPeriod)

  if (fastEMA.length === 0 || slowEMA.length === 0) {
    return []
  }

  const minLength = Math.min(fastEMA.length, slowEMA.length)
  const macdLine = Array.from({ length: minLength }, (_, i) => {
    const fast = fastEMA[i]
    const slow = slowEMA[i]
    return (!isNaN(fast) && !isNaN(slow)) ? fast - slow : NaN
  })

  const signalLine = calculateEMA(macdLine.filter(v => !isNaN(v)), signalPeriod)
  const signalOffset = macdLine.length - signalLine.length

  return macdLine.map((macdValue, i) => {
    const signalValue = signalLine[i - signalOffset] ?? NaN
    const histogram = (!isNaN(macdValue) && !isNaN(signalValue)) ? macdValue - signalValue : NaN

    return {
      time: i,
      macd: isNaN(macdValue) ? NaN : macdValue,
      signal: isNaN(signalValue) ? NaN : signalValue,
      histogram,
    }
  })
}

export function calculateBollingerBands(
  data: number[],
  period: number = 20,
  stdDev: number = 2
): Array<{ time: number; upper: number; middle: number; lower: number }> {
  if (data.length < period) return []

  const sma = calculateSMA(data, period)
  const result = Array.from({ length: data.length - period + 1 }, (_, i) => {
    const idx = period - 1 + i
    const slice = data.slice(i, i + period)
    const mean = sma[idx]
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period
    const standardDeviation = Math.sqrt(variance)

    return {
      time: idx,
      upper: mean + (standardDeviation * stdDev),
      middle: mean,
      lower: mean - (standardDeviation * stdDev),
    }
  })

  return Array(period - 1).fill(null).map((_, i) => ({
    time: i,
    upper: NaN,
    middle: NaN,
    lower: NaN,
  })).concat(result)
}

export function calculateIndicatorsFromOHLC(
  ohlcData: OHLCData[],
  options: {
    sma?: number[]
    ema?: number[]
    rsi?: boolean
    macd?: boolean
    bollingerBands?: boolean
  }
) {
  const closes = ohlcData.map(c => c.close)

  const sma = options.sma
    ? Object.fromEntries(options.sma.map(period => [period, calculateSMA(closes, period)]))
    : {}

  const ema = options.ema
    ? Object.fromEntries(options.ema.map(period => [period, calculateEMA(closes, period)]))
    : {}

  const rsi = options.rsi ? calculateRSI(closes) : []

  const macd = options.macd
    ? calculateMACD(closes).map((d, idx) => ({
        time: ohlcData[idx]?.time ?? d.time,
        macd: d.macd,
        signal: d.signal,
        histogram: d.histogram,
      }))
    : []

  const bollingerBands = options.bollingerBands
    ? calculateBollingerBands(closes).map((d, idx) => ({
        time: ohlcData[idx]?.time ?? d.time,
        upper: d.upper,
        middle: d.middle,
        lower: d.lower,
      }))
    : []

  return {
    sma,
    ema,
    rsi,
    macd,
    bollingerBands,
  }
}
