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
    if (!chartRef.current || ohlcData.length === 0) return

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

    const removeSeries = (series: ISeriesApi<'Candlestick' | 'Line' | 'Histogram'> | null) => {
      if (series) {
        try {
          chart.removeSeries(series)
        } catch {
          // Ignore
        }
      }
    }

    removeSeries(seriesRef.current)
    seriesRef.current = null
    removeSeries(volumeSeriesRef.current)
    volumeSeriesRef.current = null

    indicatorSeriesRef.current.forEach(removeSeries)
    indicatorSeriesRef.current = []

    if (config.chartType === 'candlestick') {
      const series = chart.addSeries(CandlestickSeries, CANDLESTICK_OPTIONS)
      series.setData(
        ohlcData
          .filter(isValidCandle)
          .map(c => ({
            time: c.time as Time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          })) as CandlestickData<Time>[]
      )
      seriesRef.current = series
    } else {
      const series = chart.addSeries(LineSeries, LINE_OPTIONS)
      series.setData(
        ohlcToPricePoints(ohlcData)
          .filter(isValidPoint)
          .map(p => ({
            time: p.time as Time,
            value: p.value,
          })) as LineData<Time>[]
      )
      seriesRef.current = series
    }

    if (config.indicators.volume) {
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
      volumeSeriesRef.current = volumeSeries
      indicatorSeriesRef.current.push(volumeSeries)
    }

    const addMovingAverage = (
      periods: number[],
      values: Record<number, number[]>,
      type: 'sma' | 'ema'
    ) => {
      periods.forEach((period) => {
        const periodValues = values[period] || []
        const data = ohlcData
          .map((candle, idx) => ({ time: candle.time, value: periodValues[idx] || NaN }))
          .filter(d => !isNaN(d.value))

        if (data.length > 0) {
          const series = chart.addSeries(LineSeries, {
            color: MOVING_AVERAGE_COLORS[type][period as keyof typeof MOVING_AVERAGE_COLORS.sma] || MOVING_AVERAGE_COLORS[type][20],
            lineWidth: 1,
            title: `${type.toUpperCase()} ${period}`,
          })
          series.setData(data.map(d => ({
            time: d.time as Time,
            value: d.value,
          })) as LineData<Time>[])
          indicatorSeriesRef.current.push(series)
        }
      })
    }

    if (config.indicators.sma.enabled) {
      addMovingAverage(config.indicators.sma.periods, indicators.sma, 'sma')
    }

    if (config.indicators.ema.enabled) {
      addMovingAverage(config.indicators.ema.periods, indicators.ema, 'ema')
    }

    if (config.indicators.rsi && indicators.rsi.length > 0) {
      const rsiData = ohlcData
        .map((candle, idx) => ({ time: candle.time, value: indicators.rsi[idx] || NaN }))
        .filter(d => !isNaN(d.value) && d.value >= 0 && d.value <= 100)

      if (rsiData.length > 0) {
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

        indicatorSeriesRef.current.push(rsiSeries)
      }
    }

    if (config.indicators.macd && indicators.macd.length > 0) {
      const macdData = indicators.macd
        .filter(d => !isNaN(d.macd) && !isNaN(d.signal))
        .map(d => ({ time: d.time as Time, value: d.macd }))

      const signalData = indicators.macd
        .filter(d => !isNaN(d.signal))
        .map(d => ({ time: d.time as Time, value: d.signal }))

      const histogramData = indicators.macd
        .filter(d => !isNaN(d.histogram))
        .map(d => ({
          time: d.time as Time,
          value: d.histogram,
          color: d.histogram >= 0 ? '#26a69a' : '#ef5350',
        }))

      if (macdData.length > 0) {
        const macdSeries = chart.addSeries(LineSeries, {
          color: '#2962ff',
          lineWidth: 1,
          title: 'MACD',
          priceScaleId: 'macd',
        })
        macdSeries.setData(macdData as LineData<Time>[])
        indicatorSeriesRef.current.push(macdSeries)

        const signalSeries = chart.addSeries(LineSeries, {
          color: '#ff6d00',
          lineWidth: 1,
          title: 'Signal',
          priceScaleId: 'macd',
        })
        signalSeries.setData(signalData as LineData<Time>[])
        indicatorSeriesRef.current.push(signalSeries)

        if (histogramData.length > 0) {
          const histogramSeries = chart.addSeries(HistogramSeries, {
            color: '#868993',
            priceFormat: { type: 'volume' },
            priceScaleId: 'macd',
          })
          histogramSeries.setData(histogramData.map(d => ({
            time: d.time as Time,
            value: d.value,
            color: d.color,
          })) as HistogramData<Time>[])
          indicatorSeriesRef.current.push(histogramSeries)
        }

        macdSeries.priceScale().applyOptions({
          scaleMargins: { top: 0.1, bottom: 0.1 },
        })
      }
    }

    if (config.indicators.bollingerBands && indicators.bollingerBands.length > 0) {
      const bands = ['upper', 'middle', 'lower'] as const
      const bandData = bands.map(band => ({
        data: indicators.bollingerBands
          .filter(d => !isNaN(d[band]))
          .map(d => ({ time: d.time as Time, value: d[band] })),
        title: `BB ${band.charAt(0).toUpperCase() + band.slice(1)}`,
        dashed: band !== 'middle',
      }))

      bandData.forEach(({ data, title, dashed }) => {
        if (data.length > 0) {
          const series = chart.addSeries(LineSeries, {
            color: '#868993',
            lineWidth: 1,
            lineStyle: dashed ? LineStyle.Dashed : LineStyle.Solid,
            title,
          })
          series.setData(data as LineData<Time>[])
          indicatorSeriesRef.current.push(series)
        }
      })
    }

    if (ohlcData.length > 0 && seriesRef.current) {
      const currentPrice = ohlcData[ohlcData.length - 1].close

      if (priceLineRef.current) {
        try {
          seriesRef.current.removePriceLine(priceLineRef.current)
        } catch {
          // Ignore
        }
      }

      try {
        priceLineRef.current = seriesRef.current.createPriceLine({
          price: currentPrice,
          color: '#2962ff',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: 'Current',
        })
      } catch {
        // Ignore
      }
    }

    try {
      chart.timeScale().fitContent()
    } catch {
      // Ignore
    }
  }, [ohlcData, config, indicators])

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
