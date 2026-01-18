'use client'

import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  CrosshairMode,
  LineStyle,
  type CandlestickData,
  type LineData,
  type HistogramData,
  type Time,
} from 'lightweight-charts'
import { useEffect, useRef } from 'react'
import { ohlcToPricePoints, ohlcToVolumePoints } from '../../lib/utils/chartUtils'
import { logger } from '@/shared/lib/logger'
import type { ChartConfig, OHLCData } from '../../lib/chartTypes'

interface LightweightChartProps {
  ohlcData: OHLCData[]
  config: ChartConfig
  indicators: {
    sma: Record<number, number[]>
    ema: Record<number, number[]>
    rsi: number[]
    macd: Array<{ time: number; macd: number; signal: number; histogram: number }>
    bollingerBands: Array<{ time: number; upper: number; middle: number; lower: number }>
  }
  isUsingSyntheticData: boolean
  onScrollingChange?: (isScrolling: boolean) => void
}

// Custom price formatter to show prices with 6 decimal places
const priceFormatter = (price: number): string => {
  return price.toFixed(6)
}

const CHART_OPTIONS = {
  layout: {
    background: { type: ColorType.Solid, color: '#131722' },
    textColor: '#d1d4dc',
    fontSize: 12,
  },
  grid: {
    vertLines: { color: '#1a1d29', visible: true, style: LineStyle.Solid },
    horzLines: { color: '#1a1d29', visible: true, style: LineStyle.Solid },
  },
  timeScale: {
    timeVisible: true,
    secondsVisible: false,
    borderColor: '#1a1d29',
    rightOffset: 5,
    visible: true,
    barSpacing: 6, // Default spacing between bars (increased for better visibility)
    minBarSpacing: 1, // Minimum spacing when zoomed in (prevents bars from overlapping)
    maxBarSpacing: 50, // Maximum spacing when zoomed out (prevents bars from being too spread out)
    fixLeftEdge: false, // Allow scrolling to the left
    fixRightEdge: false, // Allow scrolling to the right
    lockVisibleTimeRangeOnResize: true, // Keep zoom level when window resizes
  },
  rightPriceScale: {
    borderColor: '#1a1d29',
    scaleMargins: { top: 0.1, bottom: 0.1 },
    entireTextOnly: false,
  },
  crosshair: {
    mode: CrosshairMode.Normal,
    vertLine: { width: 1, color: '#2962ff', style: LineStyle.Solid, labelBackgroundColor: '#2962ff' },
    horzLine: { width: 1, color: '#2962ff', style: LineStyle.Solid, labelBackgroundColor: '#2962ff' },
  },
  localization: {
    priceFormatter: priceFormatter,
  },
  handleScale: {
    mouseWheel: false, // Disable default wheel zoom, we'll use custom handler for faster zoom
    pinch: true, // Keep pinch zoom for touch devices
    axisPressedMouseMove: {
      time: true,
      price: false,
    },
    axisDoubleClickReset: true,
  },
} as const

const CANDLESTICK_OPTIONS = {
  upColor: '#26a69a',
  downColor: '#ef5350',
  borderVisible: false,
  wickUpColor: '#26a69a',
  wickDownColor: '#ef5350',
  priceFormat: {
    type: 'price' as const,
    precision: 6,
    minMove: 0.000001,
  },
} as const

const LINE_OPTIONS = {
  color: '#2962ff',
  lineWidth: 2,
  priceLineVisible: false,
  lastValueVisible: true,
  priceFormat: {
    type: 'price' as const,
    precision: 6,
    minMove: 0.000001,
  },
} as const

const RSI_LEVELS = [
  { price: 70, title: 'Overbought' },
  { price: 30, title: 'Oversold' },
] as const

const MOVING_AVERAGE_COLORS = {
  sma: { 20: '#ff9800', 50: '#ff5722' },
  ema: { 20: '#9c27b0', 50: '#673ab7' },
} as const

function isValidCandle(c: OHLCData): boolean {
  return !!(c.time && !isNaN(c.time) && !isNaN(c.open) && !isNaN(c.high) && !isNaN(c.low) && !isNaN(c.close))
}

function isValidPoint(p: { time: number; value: number }): boolean {
  return !!(p.time && !isNaN(p.time) && !isNaN(p.value))
}

/**
 * Calculate price bounds ignoring outliers using aggressive percentile filtering
 * This improves chart readability by excluding extreme price movements
 * Uses 1st and 99th percentiles to filter out outliers more aggressively
 */
function calculatePriceBounds(ohlcData: OHLCData[]): { min: number; max: number; hasOutliers: boolean } | null {
  if (ohlcData.length === 0) return null

  // Extract all price values (high and low from each candle)
  const prices: number[] = []
  ohlcData.forEach(candle => {
    if (isValidCandle(candle)) {
      prices.push(candle.high, candle.low)
    }
  })

  if (prices.length === 0) return null

  // Sort prices
  const sortedPrices = [...prices].sort((a, b) => a - b)

  // Use very aggressive percentiles to filter outliers (0.5th and 99.5th percentile)
  // This excludes the top 0.5% and bottom 0.5% of extreme values
  const p05Index = Math.floor(sortedPrices.length * 0.005)
  const p995Index = Math.floor(sortedPrices.length * 0.995)
  const p05 = sortedPrices[Math.max(0, p05Index)]
  const p995 = sortedPrices[Math.min(sortedPrices.length - 1, p995Index)]

  // Also use 1st and 99th percentiles as a less aggressive fallback
  const p1Index = Math.floor(sortedPrices.length * 0.01)
  const p99Index = Math.floor(sortedPrices.length * 0.99)
  const p1 = sortedPrices[Math.max(0, p1Index)]
  const p99 = sortedPrices[Math.min(sortedPrices.length - 1, p99Index)]

  // Calculate IQR for additional filtering
  const q1Index = Math.floor(sortedPrices.length * 0.25)
  const q3Index = Math.floor(sortedPrices.length * 0.75)
  const q1 = sortedPrices[q1Index]
  const q3 = sortedPrices[q3Index]
  const iqr = q3 - q1

  // Use very tight IQR bounds (0.5 * IQR) for extremely aggressive filtering
  const lowerBound = q1 - 0.5 * iqr
  const upperBound = q3 + 0.5 * iqr

  // Use the most conservative bounds (tightest range) - prefer 99.5th percentile for max
  // This ensures we exclude the most extreme outliers
  const min = Math.max(lowerBound, p05, p1, 0) // Don't go below 0
  const max = Math.min(upperBound, p995, p99)

  // Check if there are significant outliers
  const absoluteMin = sortedPrices[0]
  const absoluteMax = sortedPrices[sortedPrices.length - 1]
  const hasOutliers = (absoluteMin < min) || (absoluteMax > max)

  // Add small padding (3%) for better visualization
  const range = max - min
  const padding = range * 0.03

  return {
    min: Math.max(0, min - padding),
    max: max + padding,
    hasOutliers,
  }
}

function removeSeries(chart: IChartApi, series: ISeriesApi<'Candlestick' | 'Line' | 'Histogram'> | null) {
  if (series) {
    try {
      chart.removeSeries(series)
    } catch {
      // Ignore
    }
  }
}

function setupMainSeries(
  chart: IChartApi,
  ohlcData: OHLCData[],
  chartType: 'candlestick' | 'line'
): ISeriesApi<'Candlestick' | 'Line'> {
  // Filter and validate candles
  const validCandles = ohlcData.filter(isValidCandle)

  if (chartType === 'candlestick') {
    const series = chart.addSeries(CandlestickSeries, CANDLESTICK_OPTIONS)
    const chartData = validCandles.map(c => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    })) as CandlestickData<Time>[]
    
    series.setData(chartData)
    return series
  } else {
    const series = chart.addSeries(LineSeries, LINE_OPTIONS)
    const pricePoints = ohlcToPricePoints(validCandles)
    const chartData = pricePoints
      .filter(isValidPoint)
      .map(p => ({
        time: p.time as Time,
        value: p.value,
      })) as LineData<Time>[]
    
    series.setData(chartData)
    return series
  }
}

function setupVolumeSeries(chart: IChartApi, ohlcData: OHLCData[]): ISeriesApi<'Histogram'> {
  const volumeSeries = chart.addSeries(HistogramSeries, {
    color: 'rgba(100, 100, 100, 0.3)',
    priceFormat: { type: 'volume' },
    priceScaleId: 'volume',
  })
  volumeSeries.priceScale().applyOptions({
    scaleMargins: { top: 0.8, bottom: 0 },
  })
  volumeSeries.setData(
    ohlcToVolumePoints(ohlcData)
      .filter(isValidPoint)
      .map(p => ({
        time: p.time as Time,
        value: p.value,
        color: p.color,
      })) as HistogramData<Time>[]
  )
  return volumeSeries
}

function setupMovingAverages(
  chart: IChartApi,
  ohlcData: OHLCData[],
  options: {
    periods: number[]
    values: Record<number, number[]>
    type: 'sma' | 'ema'
  }
): ISeriesApi<'Line'>[] {
  const series: ISeriesApi<'Line'>[] = []
  const { periods, values, type } = options
  periods.forEach((period) => {
    const periodValues = values[period] || []
    const data = ohlcData
      .map((candle, idx) => ({ time: candle.time, value: periodValues[idx] || NaN }))
      .filter(d => !isNaN(d.value))

    if (data.length > 0) {
      const maSeries = chart.addSeries(LineSeries, {
        color: MOVING_AVERAGE_COLORS[type][period as keyof typeof MOVING_AVERAGE_COLORS.sma] || MOVING_AVERAGE_COLORS[type][20],
        lineWidth: 1,
        title: `${type.toUpperCase()} ${period}`,
      })
      maSeries.setData(data.map(d => ({
        time: d.time as Time,
        value: d.value,
      })) as LineData<Time>[])
      series.push(maSeries)
    }
  })
  return series
}

function setupRSI(
  chart: IChartApi,
  ohlcData: OHLCData[],
  rsiValues: number[]
): ISeriesApi<'Line'> | null {
  const rsiData = ohlcData
    .map((candle, idx) => ({ time: candle.time, value: rsiValues[idx] || NaN }))
    .filter(d => !isNaN(d.value) && d.value >= 0 && d.value <= 100)

  if (rsiData.length === 0) return null

  const rsiSeries = chart.addSeries(LineSeries, {
    color: '#ff6d00',
    lineWidth: 1,
    title: 'RSI',
    priceScaleId: 'rsi',
  })
  rsiSeries.setData(rsiData.map(d => ({
    time: d.time as Time,
    value: d.value,
  })) as LineData<Time>[])
  rsiSeries.priceScale().applyOptions({
    scaleMargins: { top: 0.1, bottom: 0.1 },
  })

  RSI_LEVELS.forEach(({ price, title }) => {
    try {
      rsiSeries.createPriceLine({
        price,
        color: '#ff6d00',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title,
      })
    } catch {
      // Ignore
    }
  })

  return rsiSeries
}

function setupMACD(
  chart: IChartApi,
  macdData: Array<{ time: number; macd: number; signal: number; histogram: number }>
): Array<ISeriesApi<'Line' | 'Histogram'>> {
  const series: Array<ISeriesApi<'Line' | 'Histogram'>> = []

  const macdPoints = macdData
    .filter(d => !isNaN(d.macd) && !isNaN(d.signal))
    .map(d => ({ time: d.time as Time, value: d.macd }))

  const signalPoints = macdData
    .filter(d => !isNaN(d.signal))
    .map(d => ({ time: d.time as Time, value: d.signal }))

  const histogramPoints = macdData
    .filter(d => !isNaN(d.histogram))
    .map(d => ({
      time: d.time as Time,
      value: d.histogram,
      color: d.histogram >= 0 ? '#26a69a' : '#ef5350',
    }))

  if (macdPoints.length > 0) {
    const macdSeries = chart.addSeries(LineSeries, {
      color: '#2962ff',
      lineWidth: 1,
      title: 'MACD',
      priceScaleId: 'macd',
    })
    macdSeries.setData(macdPoints as LineData<Time>[])
    series.push(macdSeries)

    const signalSeries = chart.addSeries(LineSeries, {
      color: '#ff6d00',
      lineWidth: 1,
      title: 'Signal',
      priceScaleId: 'macd',
    })
    signalSeries.setData(signalPoints as LineData<Time>[])
    series.push(signalSeries)

    if (histogramPoints.length > 0) {
      const histogramSeries = chart.addSeries(HistogramSeries, {
        color: '#868993',
        priceFormat: { type: 'volume' },
        priceScaleId: 'macd',
      })
      histogramSeries.setData(histogramPoints.map(d => ({
        time: d.time as Time,
        value: d.value,
        color: d.color,
      })) as HistogramData<Time>[])
      series.push(histogramSeries)
    }

    macdSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.1, bottom: 0.1 },
    })
  }

  return series
}

function setupBollingerBands(
  chart: IChartApi,
  bandsData: Array<{ time: number; upper: number; middle: number; lower: number }>
): ISeriesApi<'Line'>[] {
  const series: ISeriesApi<'Line'>[] = []
  const bands = ['upper', 'middle', 'lower'] as const
  const bandData = bands.map(band => ({
    data: bandsData
      .filter(d => !isNaN(d[band]))
      .map(d => ({ time: d.time as Time, value: d[band] })),
    title: `BB ${band.charAt(0).toUpperCase() + band.slice(1)}`,
    dashed: band !== 'middle',
  }))

  bandData.forEach(({ data, title, dashed }) => {
    if (data.length > 0) {
      const bandSeries = chart.addSeries(LineSeries, {
        color: '#868993',
        lineWidth: 1,
        lineStyle: dashed ? LineStyle.Dashed : LineStyle.Solid,
        title,
      })
      bandSeries.setData(data as LineData<Time>[])
      series.push(bandSeries)
    }
  })

  return series
}

function setupCurrentPriceLine(
  series: ISeriesApi<'Candlestick' | 'Line'>,
  currentPrice: number,
  existingPriceLine: ReturnType<ISeriesApi<'Candlestick' | 'Line'>['createPriceLine']> | null
): ReturnType<ISeriesApi<'Candlestick' | 'Line'>['createPriceLine']> | null {
  if (existingPriceLine) {
    try {
      series.removePriceLine(existingPriceLine)
    } catch {
      // Ignore
    }
  }

  try {
    return series.createPriceLine({
      price: currentPrice,
      color: '#2962ff',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'Current',
    })
  } catch {
    return null
  }
}


function setupAllIndicators(
  chart: IChartApi,
  ohlcData: OHLCData[],
  options: {
    config: ChartConfig
    indicators: LightweightChartProps['indicators']
    indicatorSeriesRef: React.MutableRefObject<Array<ISeriesApi<'Line' | 'Histogram'>>>
    volumeSeriesRef: React.MutableRefObject<ISeriesApi<'Histogram'> | null>
  }
) {
  const { config, indicators, indicatorSeriesRef, volumeSeriesRef } = options
  // Volume is always shown
  volumeSeriesRef.current = setupVolumeSeries(chart, ohlcData)
  indicatorSeriesRef.current.push(volumeSeriesRef.current)

  if (config.indicators.sma.enabled) {
    const smaSeries = setupMovingAverages(chart, ohlcData, {
      periods: config.indicators.sma.periods,
      values: indicators.sma,
      type: 'sma',
    })
    indicatorSeriesRef.current.push(...smaSeries)
  }

  if (config.indicators.ema.enabled) {
    const emaSeries = setupMovingAverages(chart, ohlcData, {
      periods: config.indicators.ema.periods,
      values: indicators.ema,
      type: 'ema',
    })
    indicatorSeriesRef.current.push(...emaSeries)
  }

  if (config.indicators.rsi && indicators.rsi.length > 0) {
    const rsiSeries = setupRSI(chart, ohlcData, indicators.rsi)
    if (rsiSeries) {
      indicatorSeriesRef.current.push(rsiSeries)
    }
  }

  if (config.indicators.macd && indicators.macd.length > 0) {
    const macdSeries = setupMACD(chart, indicators.macd)
    indicatorSeriesRef.current.push(...macdSeries)
  }

  if (config.indicators.bollingerBands && indicators.bollingerBands.length > 0) {
    const bbSeries = setupBollingerBands(chart, indicators.bollingerBands)
    indicatorSeriesRef.current.push(...bbSeries)
  }
}

function applyPriceScaleConfiguration(
  series: ISeriesApi<'Candlestick' | 'Line'> | null,
  ohlcData: OHLCData[],
  config: ChartConfig
) {
  if (!series || ohlcData.length === 0) return

  try {
    const priceScale = series.priceScale()
    const priceBounds = calculatePriceBounds(ohlcData)
    
    if (priceBounds && priceBounds.hasOutliers) {
      // Use extremely large margins to push outliers completely out of the main view
      const isMonthlyChart = config.timeframe === '1M'
      const marginSize = isMonthlyChart ? 0.45 : 0.35
      
      priceScale.applyOptions({
        autoScale: true,
        scaleMargins: {
          top: marginSize,
          bottom: marginSize,
        },
        entireTextOnly: false,
      })
      
    } else {
      priceScale.applyOptions({
        autoScale: true,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        entireTextOnly: false,
      })
    }
  } catch (error) {
    logger.warn('Failed to apply price scale configuration', { error })
  }
}

export function LightweightChart({
  ohlcData,
  config,
  indicators,
  isUsingSyntheticData,
  onScrollingChange,
}: LightweightChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick' | 'Line'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const indicatorSeriesRef = useRef<Array<ISeriesApi<'Line' | 'Histogram'>>>([])
  const priceLineRef = useRef<ReturnType<ISeriesApi<'Candlestick' | 'Line'>['createPriceLine']> | null>(null)
  const isUserScrollingRef = useRef(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!chartContainerRef.current || chartRef.current) return

    const chart = createChart(chartContainerRef.current, {
      ...CHART_OPTIONS,
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
    })

    chartRef.current = chart

    // Track when user is scrolling/panning to prevent unnecessary refetches
    const timeScale = chart.timeScale()
    
    const handleVisibleRangeChange = () => {
      isUserScrollingRef.current = true
      onScrollingChange?.(true)
      
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      
      // Reset scrolling flag after user stops interacting
      scrollTimeoutRef.current = setTimeout(() => {
        isUserScrollingRef.current = false
        onScrollingChange?.(false)
      }, 2000) // 2 seconds after last scroll
    }
    
    timeScale.subscribeVisibleTimeRangeChange(handleVisibleRangeChange)

    // Custom mouse wheel handler for faster zoom
    const handleWheel = (e: WheelEvent) => {
      if (!chartContainerRef.current || !chartRef.current) return
      
      // Only handle wheel events when over the chart
      const rect = chartContainerRef.current.getBoundingClientRect()
      const isOverChart = 
        e.clientX >= rect.left && 
        e.clientX <= rect.right && 
        e.clientY >= rect.top && 
        e.clientY <= rect.bottom
      
      if (!isOverChart) return
      
      // Prevent default scrolling
      e.preventDefault()
      
      const zoomMultiplier = 2.5 // Increase zoom speed by 2.5x
      const currentOptions = timeScale.options()
      const currentBarSpacing = currentOptions.barSpacing || 6
      const minBarSpacing = currentOptions.minBarSpacing || 1
      const maxBarSpacing = currentOptions.maxBarSpacing || 50
      
      // Calculate new bar spacing based on wheel delta
      // Negative deltaY means zoom in (decrease spacing), positive means zoom out (increase spacing)
      const delta = e.deltaY * -0.01 * zoomMultiplier // Negative to invert direction, multiply for speed
      let newBarSpacing = currentBarSpacing + delta
      
      // Clamp to min/max bounds
      newBarSpacing = Math.max(minBarSpacing, Math.min(maxBarSpacing, newBarSpacing))
      
      // Apply the new bar spacing for faster zoom
      timeScale.applyOptions({
        barSpacing: newBarSpacing,
      })
      
      // Mark as scrolling
      handleVisibleRangeChange()
    }
    
    // Add wheel event listener to container
    const container = chartContainerRef.current
    container.addEventListener('wheel', handleWheel, { passive: false })

    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        })
      }
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (container) {
        container.removeEventListener('wheel', handleWheel)
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      chartRef.current?.remove()
      chartRef.current = null
    }
  }, [onScrollingChange])

  useEffect(() => {
    if (!chartRef.current) return

    const container = chartContainerRef.current
    if (container && (container.clientWidth === 0 || container.clientHeight === 0)) {
      const timer = setTimeout(() => {
        if (chartRef.current && container.clientWidth > 0 && container.clientHeight > 0) {
          chartRef.current.applyOptions({
            width: container.clientWidth,
            height: container.clientHeight,
          })
        }
      }, 100)
      return () => clearTimeout(timer)
    }

    const chart = chartRef.current

    removeSeries(chart, seriesRef.current)
    seriesRef.current = null
    removeSeries(chart, volumeSeriesRef.current)
    volumeSeriesRef.current = null

    indicatorSeriesRef.current.forEach(series => removeSeries(chart, series))
    indicatorSeriesRef.current = []

    seriesRef.current = setupMainSeries(chart, ohlcData, config.chartType)

    setupAllIndicators(chart, ohlcData, { config, indicators, indicatorSeriesRef, volumeSeriesRef })

    if (ohlcData.length > 0 && seriesRef.current) {
      const currentPrice = ohlcData[ohlcData.length - 1].close
      priceLineRef.current = setupCurrentPriceLine(seriesRef.current, currentPrice, priceLineRef.current)
    }

    applyPriceScaleConfiguration(seriesRef.current, ohlcData, config)

    try {
      chart.timeScale().fitContent()
    } catch {
      // Ignore
    }
  }, [ohlcData, config, indicators, isUsingSyntheticData])

  return (
    <div className="h-full flex flex-col relative bg-[#131722]">
      {isUsingSyntheticData && (
        <div className="absolute top-3 left-3 z-10 px-2.5 py-1 bg-[#1e222d]/90 backdrop-blur-sm rounded text-xs text-[#868993] border border-[#2a2e39]">
          Using order book data
        </div>
      )}

      <div className="flex-1 relative min-h-[400px]">
        <div ref={chartContainerRef} className="w-full h-full min-h-[400px]" />
      </div>
    </div>
  )
}
