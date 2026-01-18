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
} as const

const CANDLESTICK_OPTIONS = {
  upColor: '#26a69a',
  downColor: '#ef5350',
  borderVisible: false,
  wickUpColor: '#26a69a',
  wickDownColor: '#ef5350',
} as const

const LINE_OPTIONS = {
  color: '#2962ff',
  lineWidth: 2,
  priceLineVisible: false,
  lastValueVisible: true,
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
  
  logger.debug('Setting up main series', {
    totalCandles: ohlcData.length,
    validCandles: validCandles.length,
    chartType,
    firstValidCandle: validCandles[0] ? {
      time: validCandles[0].time,
      open: validCandles[0].open,
      high: validCandles[0].high,
      low: validCandles[0].low,
      close: validCandles[0].close,
    } : null,
  })

  if (validCandles.length === 0) {
    logger.warn('No valid candles to display', {
      totalCandles: ohlcData.length,
      sampleCandle: ohlcData[0] ? {
        time: ohlcData[0].time,
        timeType: typeof ohlcData[0].time,
        open: ohlcData[0].open,
        openType: typeof ohlcData[0].open,
        high: ohlcData[0].high,
        low: ohlcData[0].low,
        close: ohlcData[0].close,
        volume: ohlcData[0].volume,
        isValid: isValidCandle(ohlcData[0]),
      } : null,
    })
  }

  if (chartType === 'candlestick') {
    const series = chart.addSeries(CandlestickSeries, CANDLESTICK_OPTIONS)
    const chartData = validCandles.map(c => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    })) as CandlestickData<Time>[]
    
    logger.debug('Setting candlestick data', {
      dataPoints: chartData.length,
      firstPoint: chartData[0] ? {
        time: chartData[0].time,
        timeType: typeof chartData[0].time,
        open: chartData[0].open,
        high: chartData[0].high,
        low: chartData[0].low,
        close: chartData[0].close,
      } : null,
    })
    
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
    
    logger.debug('Setting line data', {
      dataPoints: chartData.length,
      firstPoint: chartData[0] ? {
        time: chartData[0].time,
        timeType: typeof chartData[0].time,
        value: chartData[0].value,
      } : null,
    })
    
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

export function LightweightChart({
  ohlcData,
  config,
  indicators,
  isUsingSyntheticData,
}: LightweightChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick' | 'Line'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const indicatorSeriesRef = useRef<Array<ISeriesApi<'Line' | 'Histogram'>>>([])
  const priceLineRef = useRef<ReturnType<ISeriesApi<'Candlestick' | 'Line'>['createPriceLine']> | null>(null)

  useEffect(() => {
    if (!chartContainerRef.current || chartRef.current) return

    const chart = createChart(chartContainerRef.current, {
      ...CHART_OPTIONS,
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
    })

    chartRef.current = chart

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
      chartRef.current?.remove()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!chartRef.current) return

    // Log data received by chart component
    logger.debug('LightweightChart received data', {
      ohlcDataLength: ohlcData.length,
      firstCandle: ohlcData[0] ? {
        time: ohlcData[0].time,
        open: ohlcData[0].open,
        high: ohlcData[0].high,
        low: ohlcData[0].low,
        close: ohlcData[0].close,
        volume: ohlcData[0].volume,
        timeType: typeof ohlcData[0].time,
      } : null,
      lastCandle: ohlcData.length > 0 ? {
        time: ohlcData[ohlcData.length - 1].time,
        open: ohlcData[ohlcData.length - 1].open,
        high: ohlcData[ohlcData.length - 1].high,
        low: ohlcData[ohlcData.length - 1].low,
        close: ohlcData[ohlcData.length - 1].close,
        volume: ohlcData[ohlcData.length - 1].volume,
      } : null,
      isValidCandles: ohlcData.filter(isValidCandle).length,
      isUsingSyntheticData,
    })

    // If no data, still render the chart (it will be empty)
    if (ohlcData.length === 0) {
      logger.debug('No OHLC data to display in chart', {
        ohlcDataLength: ohlcData.length,
        receivedData: ohlcData,
      })
      // Don't return early - let the chart render empty so user can see it's waiting for data
      // The chart library will handle empty data gracefully
    }

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

    if (config.indicators.volume) {
      volumeSeriesRef.current = setupVolumeSeries(chart, ohlcData)
      indicatorSeriesRef.current.push(volumeSeriesRef.current)
    }

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

    if (ohlcData.length > 0 && seriesRef.current) {
      const currentPrice = ohlcData[ohlcData.length - 1].close
      priceLineRef.current = setupCurrentPriceLine(seriesRef.current, currentPrice, priceLineRef.current)
    }

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
