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
import { useEffect, useRef, useState } from 'react'
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

// Price scale margins for each timeframe (candlestick charts)
// Shorter timeframes need more margin to show price line properly
// Longer timeframes can use tighter margins for better candle visibility
const TIMEFRAME_MARGINS: Record<string, number> = {
  '1m': 0.15,  // More margin for short timeframes to show price line
  '15m': 0.15, // More margin for short timeframes to show price line
  '1h': 0.12,  // Slightly more margin for 1h to show price line properly
  '4h': 0.08,  // Moderate margin for 4h
  '1D': 0.05,  // Tighter margin for daily
  '1W': 0.03,  // Very tight margin for weekly
  '1M': 0.02,  // Very tight margin for monthly
} as const

// Default margin for line charts and unknown timeframes
const DEFAULT_MARGIN = 0.1

// Default zoom levels (hours back) for each timeframe
// These determine how much historical data is shown when switching timeframes
const TIMEFRAME_ZOOM_HOURS: Record<string, number> = {
  '1m': 24,      // Last 24 hours
  '15m': 48,     // Last 48 hours (2 day)
  '1h': 72,      // Last 6 days (24 * 6)
  '4h': 720,      // Last month (24 * 30)
  '1D': 2160,     // Last 3 months (24 * 90)
  '1W': 4310,    // Last 6 months (24 * 90)
  '1M': 8760,    // Last year (24 * 365)
} as const

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
    const isCandlestick = config.chartType === 'candlestick'
    
    // Get margin size from constant based on timeframe
    const marginSize = isCandlestick
      ? (TIMEFRAME_MARGINS[config.timeframe] ?? DEFAULT_MARGIN)
      : DEFAULT_MARGIN
    
    // Use standard autoScale with timeframe-appropriate margins
    priceScale.applyOptions({
      autoScale: true,
      scaleMargins: {
        top: marginSize,
        bottom: marginSize,
      },
      entireTextOnly: false,
    })
  } catch (error) {
    logger.warn('Failed to apply price scale configuration', { error })
    // Fallback: ensure autoScale is enabled even if configuration fails
    try {
      const priceScale = series.priceScale()
      priceScale.applyOptions({
        autoScale: true,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      })
    } catch {
      // Ignore fallback errors
    }
  }
}

function getHoursBackForTimeframe(timeframe: string): number {
  return TIMEFRAME_ZOOM_HOURS[timeframe] ?? 24 // Default to 24 hours if timeframe not found
}

function applyDefaultZoomLevel(
  timeScale: ReturnType<IChartApi['timeScale']>,
  ohlcData: OHLCData[],
  timeframe: string
) {
  try {
    if (ohlcData.length > 0) {
      const lastCandleTime = ohlcData[ohlcData.length - 1].time
      const firstCandleTime = ohlcData[0].time
      const hoursBack = getHoursBackForTimeframe(timeframe)
      
      // Calculate range from the last candle time (not current time)
      // This ensures we show the last X hours of available data
      const to = lastCandleTime
      const from = Math.max(
        lastCandleTime - (hoursBack * 60 * 60), // X hours back from last candle
        firstCandleTime // Don't go before first available data
      )
      
      // Only set range if it's valid
      if (from < to) {
        timeScale.setVisibleRange({
          from: from as Time,
          to: to as Time,
        })
      } else {
        // Fallback to fitContent if range is invalid
        timeScale.fitContent()
      }
    } else {
      // Fallback to fitContent if no data
      timeScale.fitContent()
    }
  } catch {
    // Fallback to fitContent on error
    try {
      timeScale.fitContent()
    } catch {
      // Ignore
    }
  }
}

function OHLCDataPanel({ 
  data, 
  change 
}: { 
  data: OHLCData | null
  change: { value: number; percent: number } | null 
}) {
  if (!data) return null

  return (
    <div className="absolute top-2 left-2 z-10 px-2 py-1.5 bg-[#1e222d]/70 backdrop-blur-sm rounded-md border border-[#2a2e39]/50 shadow-md max-w-[calc(50%-1rem)]">
      <div className="flex flex-col gap-1 text-[10px]">
        {/* Line 1: O, H */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[#868993] whitespace-nowrap">O:</span>
            <span className="text-[#d1d4dc] font-medium truncate">{data.open.toFixed(6)}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[#868993] whitespace-nowrap">H:</span>
            <span className="text-[#d1d4dc] font-medium truncate">{data.high.toFixed(6)}</span>
          </div>
        </div>
        {/* Line 2: L, C */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[#868993] whitespace-nowrap">L:</span>
            <span className="text-[#d1d4dc] font-medium truncate">{data.low.toFixed(6)}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[#868993] whitespace-nowrap">C:</span>
            <span className="text-[#d1d4dc] font-medium truncate">{data.close.toFixed(6)}</span>
          </div>
        </div>
        {/* Line 3: Volume, Chg */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[#868993] whitespace-nowrap">Volume:</span>
            <span className="text-[#d1d4dc] font-medium truncate">{data.volume.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[#868993] whitespace-nowrap">Chg:</span>
            {change ? (
              <span className={`font-medium truncate ${change.value >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
                {change.value >= 0 ? '+' : ''}{change.value.toFixed(6)} ({change.percent >= 0 ? '+' : ''}{change.percent.toFixed(2)}%)
              </span>
            ) : (
              <span className="text-[#868993]">—</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function applyBarSpacing(timeScale: ReturnType<IChartApi['timeScale']>, config: ChartConfig) {
  if (config.timeframe === '1M' && config.chartType === 'candlestick') {
    // For monthly candlestick charts, use larger default spacing and higher max
    timeScale.applyOptions({
      barSpacing: 12, // Double the default spacing for monthly charts
      minBarSpacing: 2, // Allow more spacing when zoomed in
      maxBarSpacing: 100, // Allow much more spacing when zoomed out
    })
  } else {
    // Reset to default for other timeframes
    timeScale.applyOptions({
      barSpacing: 6,
      minBarSpacing: 1,
      maxBarSpacing: 50,
    })
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
  const previousTimeframeRef = useRef<string | null>(null)
  const [hoveredData, setHoveredData] = useState<OHLCData | null>(null)

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

    // Subscribe to crosshair move to update hovered data
    const handleCrosshairMove = (param: Parameters<Parameters<IChartApi['subscribeCrosshairMove']>[0]>[0]) => {
      if (param.time && param.seriesData) {
        // Use current ohlcData from closure
        const currentData = ohlcData
        if (currentData.length > 0) {
          // Find the candle data for the hovered time
          const hoveredTime = param.time as number
          const candle = currentData.find(c => c.time === hoveredTime)
          if (candle) {
            setHoveredData(candle)
          } else {
            // If exact match not found, find closest candle
            const closestCandle = currentData.reduce((prev, curr) => {
              const prevDiff = Math.abs(prev.time - hoveredTime)
              const currDiff = Math.abs(curr.time - hoveredTime)
              return currDiff < prevDiff ? curr : prev
            })
            setHoveredData(closestCandle)
          }
        }
      } else {
        setHoveredData(null)
      }
    }
    
    chart.subscribeCrosshairMove(handleCrosshairMove)

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
      
      const zoomMultiplier = 2.5 // Zoom speed multiplier (reduced from 2.5 for less acceleration)
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
  }, [onScrollingChange, ohlcData])

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

    // Apply better bar spacing for monthly charts to make candles more visible
    const timeScale = chart.timeScale()
    applyBarSpacing(timeScale, config)

    // Set default zoom level based on timeframe (only when timeframe changes)
    const timeframeChanged = previousTimeframeRef.current !== config.timeframe
    if (timeframeChanged) {
      previousTimeframeRef.current = config.timeframe
      applyDefaultZoomLevel(timeScale, ohlcData, config.timeframe)
    }
  }, [ohlcData, config, indicators, isUsingSyntheticData])

  // Calculate change percentage from previous candle
  const change = (() => {
    if (!hoveredData || ohlcData.length < 2) return null
    
    const currentIndex = ohlcData.findIndex(c => c.time === hoveredData.time)
    if (currentIndex <= 0) return null
    
    const previousCandle = ohlcData[currentIndex - 1]
    const changeValue = hoveredData.close - previousCandle.close
    const percent = (changeValue / previousCandle.close) * 100
    
    return { value: changeValue, percent }
  })()
  const displayData = hoveredData || (ohlcData.length > 0 ? ohlcData[ohlcData.length - 1] : null)

  return (
    <div className="h-full flex flex-col relative bg-[#131722]">
      {isUsingSyntheticData && (
        <div className="absolute top-3 left-3 z-10 px-2.5 py-1 bg-[#1e222d]/90 backdrop-blur-sm rounded text-xs text-[#868993] border border-[#2a2e39]">
          Using order book data
        </div>
      )}

      {/* OHLC Data Panel */}
      <OHLCDataPanel data={displayData} change={change} />

      <div className="flex-1 relative min-h-[400px]">
        <div ref={chartContainerRef} className="w-full h-full min-h-[400px]" />
      </div>
    </div>
  )
}
