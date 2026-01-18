'use client'

import { useState } from 'react'
import { BarChart3, LineChart } from 'lucide-react'
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

export default function PriceChart() {
  const [config, setConfig] = useState<ChartConfig>(DEFAULT_CONFIG)
  const [isUserScrolling, setIsUserScrolling] = useState(false)

  const {
    ohlcData,
    isLoadingOHLC,
    isErrorOHLC,
    ohlcError,
    indicators,
    isUsingSyntheticData,
  } = usePriceChart({ config, isUserScrolling })

  const updateConfig = (updates: Partial<ChartConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }))
  }

  if (isLoadingOHLC) return <LoadingState />
  if (isErrorOHLC) return <ErrorState error={ohlcError} />

  // Always show the chart, even if there's no data - it will display empty gracefully
  return (
    <div className="h-full flex flex-col relative bg-[#131722]">
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
        {/* Chart Type Toggle - Glass morphism style */}
        <div className="flex items-center gap-0.5 p-0.5 backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg shadow-lg">
          <button
            onClick={() => updateConfig({ chartType: 'candlestick' })}
            className={`p-1.5 rounded-md transition-all duration-200 ${
              config.chartType === 'candlestick'
                ? 'bg-white/20 text-white shadow-sm'
                : 'text-white/60 hover:text-white/80 hover:bg-white/5'
            }`}
            title="Candlestick Chart"
          >
            <BarChart3 className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
          <button
            onClick={() => updateConfig({ chartType: 'line' })}
            className={`p-1.5 rounded-md transition-all duration-200 ${
              config.chartType === 'line'
                ? 'bg-white/20 text-white shadow-sm'
                : 'text-white/60 hover:text-white/80 hover:bg-white/5'
            }`}
            title="Line Chart"
          >
            <LineChart className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </div>

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
      </div>

      <LightweightChart
        ohlcData={ohlcData}
        config={config}
        indicators={indicators}
        isUsingSyntheticData={isUsingSyntheticData}
        onScrollingChange={setIsUserScrolling}
      />
    </div>
  )
}
