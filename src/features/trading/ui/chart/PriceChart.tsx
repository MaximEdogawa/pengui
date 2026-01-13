'use client'

import { useState } from 'react'
import { usePriceChart } from '../../model/usePriceChart'
import { LightweightChart } from './LightweightChart'
import type { ChartConfig, Timeframe } from '../../lib/chartTypes'

const DEFAULT_CONFIG: ChartConfig = {
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
}

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1D', '1W', '1M']
const CONTROL_CLASS = "px-3 py-1.5 text-xs font-medium rounded-md bg-[#1e222d] border border-[#2a2e39] text-[#d1d4dc] hover:bg-[#252936] focus:outline-none focus:ring-2 focus:ring-[#2962ff]/50 transition-colors"

function LoadingState() {
  return (
    <div className="h-full flex items-center justify-center bg-[#131722]">
      <p className="text-[#d1d4dc]">Loading...</p>
    </div>
  )
}

function ErrorState({ error }: { error?: unknown }) {
  const errorMessage = error instanceof Error ? error.message : error ? String(error) : null
  
  return (
    <div className="h-full flex flex-col items-center justify-center p-4 bg-[#131722]">
      <p className="text-[#ef5350] mb-2">Error loading chart data</p>
      {errorMessage && (
        <p className="text-xs text-[#868993]">
          {errorMessage}
        </p>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center p-4 bg-[#131722]">
      <p className="text-[#d1d4dc]">No chart data available</p>
    </div>
  )
}

export default function PriceChart() {
  const [config, setConfig] = useState<ChartConfig>(DEFAULT_CONFIG)

  const {
    ohlcData,
    isLoadingOHLC,
    isErrorOHLC,
    ohlcError,
    indicators,
    hasData,
    isUsingSyntheticData,
  } = usePriceChart({ config })

  const updateConfig = (updates: Partial<ChartConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }))
  }

  if (isLoadingOHLC) return <LoadingState />
  if (isErrorOHLC) return <ErrorState error={ohlcError} />
  if (!hasData) return <EmptyState />

  return (
    <div className="h-full flex flex-col relative bg-[#131722]">
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        <select
          value={config.chartType}
          onChange={(e) => {
            const newType = e.target.value as 'candlestick' | 'line'
            if (newType === 'candlestick' || newType === 'line') {
              updateConfig({ chartType: newType })
            }
          }}
          className={CONTROL_CLASS}
        >
          <option value="candlestick">Candles</option>
          <option value="line">Line</option>
        </select>

        <select
          value={config.timeframe}
          onChange={(e) => updateConfig({ timeframe: e.target.value as Timeframe })}
          className={CONTROL_CLASS}
        >
          {TIMEFRAMES.map((tf) => (
            <option key={tf} value={tf}>
              {tf}
            </option>
          ))}
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

      <LightweightChart
        ohlcData={ohlcData}
        config={config}
        indicators={indicators}
        isUsingSyntheticData={isUsingSyntheticData}
      />
    </div>
  )
}
