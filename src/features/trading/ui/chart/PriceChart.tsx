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
import { usePriceChart } from '../../model/usePriceChart'
import { ohlcToPricePoints, ohlcToVolumePoints } from '../../lib/utils/chartUtils'
import type { ChartConfig, ChartType, Timeframe } from '../../lib/chartTypes'

export default function PriceChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick' | 'Line'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const indicatorSeriesRef = useRef<Array<ISeriesApi<'Line' | 'Histogram'>>>([])
  const priceLineRef = useRef<ReturnType<ISeriesApi<'Candlestick' | 'Line'>['createPriceLine']> | null>(null)

  const [config, setConfig] = useState<ChartConfig>({
    chartType: 'candlestick',
    timeframe: '1h',
    indicators: {
      sma: { enabled: false, periods: [20, 50] },
      ema: { enabled: false, periods: [20, 50] },
      volume: true,
      rsi: false,
      macd: false,
      bollingerBands: false,
    },
  })

  const {
    ohlcData,
    isLoadingOHLC,
    isErrorOHLC,
    ohlcError,
    indicators,
    hasData,
    tickerId,
    tickerDisplayName,
    isUsingSyntheticData,
  } = usePriceChart({ config })

  useEffect(() => {
    if (!chartContainerRef.current || chartRef.current) return
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#131722' },
        textColor: '#d1d4dc',
        fontSize: 12,
      },
      grid: {
        vertLines: { 
          color: '#1a1d29', 
          visible: true,
          style: LineStyle.Solid,
        },
        horzLines: { 
          color: '#1a1d29', 
          visible: true,
          style: LineStyle.Solid,
        },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#1a1d29',
        rightOffset: 5,
      },
      rightPriceScale: {
        borderColor: '#1a1d29',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        entireTextOnly: false,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          width: 1,
          color: '#2962ff',
          style: LineStyle.Solid,
          labelBackgroundColor: '#2962ff',
        },
        horzLine: {
          width: 1,
          color: '#2962ff',
          style: LineStyle.Solid,
          labelBackgroundColor: '#2962ff',
        },
      },
    })

    chartRef.current = chart

    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!chartRef.current || ohlcData.length === 0) return

    const container = chartContainerRef.current
    if (container && (container.clientWidth === 0 || container.clientHeight === 0)) {
      const timer = setTimeout(() => {
        if (chartRef.current && container.clientWidth > 0 && container.clientHeight > 0) {
          chartRef.current?.applyOptions({
            width: container.clientWidth,
            height: container.clientHeight,
          })
        }
      }, 100)
      return () => clearTimeout(timer)
    }

    const chart = chartRef.current

    if (seriesRef.current) {
      try {
        chart.removeSeries(seriesRef.current)
      } catch {
        // Ignore
      }
      seriesRef.current = null
    }

    if (volumeSeriesRef.current) {
      try {
        chart.removeSeries(volumeSeriesRef.current)
      } catch {
        // Ignore
      }
      volumeSeriesRef.current = null
    }

    indicatorSeriesRef.current.forEach((series) => {
      try {
        chart.removeSeries(series)
      } catch {
        // Ignore
      }
    })
    indicatorSeriesRef.current = []

    if (config.chartType === 'candlestick') {
      const series = chart.addSeries(CandlestickSeries, {
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      })
      series.setData(
        ohlcData
          .filter(c => c.time && !isNaN(c.time) && !isNaN(c.open) && !isNaN(c.high) && !isNaN(c.low) && !isNaN(c.close))
          .map(c => ({
            time: c.time as Time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          })) as CandlestickData<Time>[]
      )
      seriesRef.current = series
    } else if (config.chartType === 'line') {
      const series = chart.addSeries(LineSeries, {
        color: '#2962ff',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
      })
      series.setData(
        ohlcToPricePoints(ohlcData)
          .filter(p => p.time && !isNaN(p.time) && !isNaN(p.value))
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
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: 'volume',
      })
      volumeSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      })
      const volumeData = ohlcToVolumePoints(ohlcData)
        .filter(p => p.time && !isNaN(p.time) && !isNaN(p.value))
        .map(p => ({
          time: p.time as Time,
          value: p.value,
          color: p.color,
        })) as HistogramData<Time>[]
      
      volumeSeries.setData(volumeData)
      volumeSeriesRef.current = volumeSeries
      indicatorSeriesRef.current.push(volumeSeries)
    }

    if (config.indicators.sma.enabled) {
      for (const period of config.indicators.sma.periods) {
        const smaValues = indicators.sma[period] || []
        const smaData = ohlcData.map((candle, idx) => ({
          time: candle.time,
          value: smaValues[idx] || NaN,
        })).filter(d => !isNaN(d.value))

        if (smaData.length > 0) {
          const smaSeries = chart.addSeries(LineSeries, {
            color: period === 20 ? '#ff9800' : '#ff5722',
            lineWidth: 1,
            title: `SMA ${period}`,
          })
          smaSeries.setData(smaData.map(d => ({
            time: d.time as Time,
            value: d.value,
          })) as LineData<Time>[])
          indicatorSeriesRef.current.push(smaSeries)
        }
      }
    }

    if (config.indicators.ema.enabled) {
      for (const period of config.indicators.ema.periods) {
        const emaValues = indicators.ema[period] || []
        const emaData = ohlcData.map((candle, idx) => ({
          time: candle.time,
          value: emaValues[idx] || NaN,
        })).filter(d => !isNaN(d.value))

        if (emaData.length > 0) {
          const emaSeries = chart.addSeries(LineSeries, {
            color: period === 20 ? '#9c27b0' : '#673ab7',
            lineWidth: 1,
            title: `EMA ${period}`,
          })
          emaSeries.setData(emaData.map(d => ({
            time: d.time as Time,
            value: d.value,
          })) as LineData<Time>[])
          indicatorSeriesRef.current.push(emaSeries)
        }
      }
    }

    if (config.indicators.rsi && indicators.rsi.length > 0) {
      const rsiData = ohlcData.map((candle, idx) => ({
        time: candle.time,
        value: indicators.rsi[idx] || NaN,
      })).filter(d => !isNaN(d.value) && d.value >= 0 && d.value <= 100)

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
        
        try {
          rsiSeries.createPriceLine({
            price: 70,
            color: '#ff6d00',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: 'Overbought',
          })
          rsiSeries.createPriceLine({
            price: 30,
            color: '#ff6d00',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: 'Oversold',
          })
        } catch {
          // Ignore
        }
        
        indicatorSeriesRef.current.push(rsiSeries)
      }
    }

    if (config.indicators.macd && indicators.macd.length > 0) {
      const macdData = indicators.macd
        .filter(d => !isNaN(d.macd) && !isNaN(d.signal))
        .map(d => ({
          time: d.time as Time,
          value: d.macd,
        }))

      const signalData = indicators.macd
        .filter(d => !isNaN(d.signal))
        .map(d => ({
          time: d.time as Time,
          value: d.signal,
        }))

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
            priceFormat: {
              type: 'volume',
            },
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
      const upperData = indicators.bollingerBands
        .filter(d => !isNaN(d.upper))
        .map(d => ({
          time: d.time as Time,
          value: d.upper,
        }))

      const middleData = indicators.bollingerBands
        .filter(d => !isNaN(d.middle))
        .map(d => ({
          time: d.time as Time,
          value: d.middle,
        }))

      const lowerData = indicators.bollingerBands
        .filter(d => !isNaN(d.lower))
        .map(d => ({
          time: d.time as Time,
          value: d.lower,
        }))

      if (upperData.length > 0) {
        const upperSeries = chart.addSeries(LineSeries, {
          color: '#868993',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          title: 'BB Upper',
        })
        upperSeries.setData(upperData as LineData<Time>[])
        indicatorSeriesRef.current.push(upperSeries)

        const middleSeries = chart.addSeries(LineSeries, {
          color: '#868993',
          lineWidth: 1,
          title: 'BB Middle',
        })
        middleSeries.setData(middleData as LineData<Time>[])
        indicatorSeriesRef.current.push(middleSeries)

        const lowerSeries = chart.addSeries(LineSeries, {
          color: '#868993',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          title: 'BB Lower',
        })
        lowerSeries.setData(lowerData as LineData<Time>[])
        indicatorSeriesRef.current.push(lowerSeries)
      }
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
  }, [ohlcData, config, indicators, hasData])

  const updateConfig = (updates: Partial<ChartConfig>) => {
    setConfig({ ...config, ...updates })
  }

  if (isLoadingOHLC) {
    return (
      <div className="h-full flex items-center justify-center bg-[#131722]">
        <p className="text-[#d1d4dc]">Loading...</p>
      </div>
    )
  }

  if (isErrorOHLC) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 bg-[#131722]">
        <p className="text-[#ef5350] mb-2">Error loading chart data</p>
        {ohlcError && (
          <p className="text-xs text-[#868993]">
            {ohlcError instanceof Error ? ohlcError.message : 'Unknown error'}
          </p>
        )}
      </div>
    )
  }

  if (!hasData) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 bg-[#131722]">
        <p className="text-[#d1d4dc]">No chart data available</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col relative bg-[#131722]">
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        <select
          value={config.chartType}
          onChange={(e) => {
            const newType = e.target.value as ChartType
            if (newType === 'candlestick' || newType === 'line') {
              updateConfig({ chartType: newType })
            }
          }}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-[#1e222d] border border-[#2a2e39] text-[#d1d4dc] hover:bg-[#252936] focus:outline-none focus:ring-2 focus:ring-[#2962ff]/50 transition-colors"
        >
          <option value="candlestick">Candles</option>
          <option value="line">Line</option>
        </select>

        <select
          value={config.timeframe}
          onChange={(e) => updateConfig({ timeframe: e.target.value as Timeframe })}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-[#1e222d] border border-[#2a2e39] text-[#d1d4dc] hover:bg-[#252936] focus:outline-none focus:ring-2 focus:ring-[#2962ff]/50 transition-colors"
        >
          <option value="1m">1m</option>
          <option value="5m">5m</option>
          <option value="15m">15m</option>
          <option value="1h">1h</option>
          <option value="4h">4h</option>
          <option value="1D">1D</option>
          <option value="1W">1W</option>
          <option value="1M">1M</option>
        </select>

        <button
          onClick={() => updateConfig({ 
            indicators: { ...config.indicators, volume: !config.indicators.volume }
          })}
          className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
            config.indicators.volume
              ? 'bg-[#2962ff] text-white border-[#2962ff] hover:bg-[#1e53e5]'
              : 'bg-[#1e222d] text-[#d1d4dc] border-[#2a2e39] hover:bg-[#252936]'
          }`}
        >
          Vol
        </button>
      </div>

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
