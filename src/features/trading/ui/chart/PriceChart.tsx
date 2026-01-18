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

export default function PriceChart() {
  const [config, setConfig] = useState<ChartConfig>(DEFAULT_CONFIG)
  const [showDebug, setShowDebug] = useState(false)

  const {
    ohlcData,
    isLoadingOHLC,
    isErrorOHLC,
    ohlcError,
    indicators,
    isUsingSyntheticData,
    tickerId,
    tickerDisplayName,
    filters,
  } = usePriceChart({ config })

  const updateConfig = (updates: Partial<ChartConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }))
  }

  if (isLoadingOHLC) return <LoadingState />
  if (isErrorOHLC) return <ErrorState error={ohlcError} />

  // Always show the chart, even if there's no data - it will display empty gracefully
  return (
    <div className="h-full flex flex-col relative bg-[#131722]">
      {/* Debug Panel */}
      {showDebug && (
        <div className="absolute top-3 left-3 z-20 bg-[#1e222d]/95 backdrop-blur-sm rounded-lg p-4 text-xs text-[#d1d4dc] border border-[#2a2e39] max-w-md max-h-[80vh] overflow-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-sm">Chart Debug Info</h3>
            <button
              onClick={() => setShowDebug(false)}
              className="text-[#868993] hover:text-[#d1d4dc]"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <div className="text-[#868993] mb-1">Trading Pair:</div>
              <div className="font-mono text-xs">
                {tickerDisplayName || 'Not set'}
              </div>
              <div className="text-[#868993] text-xs mt-1">
                Ticker ID: {tickerId || 'Not resolved'}
              </div>
            </div>

            <div>
              <div className="text-[#868993] mb-1">Filters:</div>
              <div className="font-mono text-xs">
                Buy: {filters?.buyAsset?.join(', ') || 'None'}
                <br />
                Sell: {filters?.sellAsset?.join(', ') || 'None'}
              </div>
            </div>

            <div>
              <div className="text-[#868993] mb-1">Chart Requirements:</div>
              <div className="font-mono text-xs space-y-1">
                <div>✓ OHLC Data: Array of objects with:</div>
                <div className="pl-4 text-[#868993]">
                  • time: number (Unix seconds)
                  <br />
                  • open: number
                  <br />
                  • high: number
                  <br />
                  • low: number
                  <br />
                  • close: number
                  <br />
                  • volume: number
                </div>
              </div>
            </div>

            <div>
              <div className="text-[#868993] mb-1">Current Data:</div>
              <div className="font-mono text-xs">
                <div>OHLC Candles: {ohlcData.length}</div>
                <div>Using Synthetic: {isUsingSyntheticData ? 'Yes' : 'No'}</div>
                {ohlcData.length > 0 && (
                  <div className="mt-2 text-[#868993]">
                    First candle:
                    <br />
                    <div className="pl-2">
                      time: {ohlcData[0].time}
                      <br />
                      open: {ohlcData[0].open}
                      <br />
                      high: {ohlcData[0].high}
                      <br />
                      low: {ohlcData[0].low}
                      <br />
                      close: {ohlcData[0].close}
                      <br />
                      volume: {ohlcData[0].volume}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="text-[#868993] mb-1">Status:</div>
              <div className="font-mono text-xs">
                {isLoadingOHLC ? '⏳ Loading...' : ohlcData.length === 0 ? '❌ No data' : '✅ Ready'}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        <button
          onClick={() => setShowDebug(!showDebug)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
            showDebug
              ? 'bg-[#2962ff] text-white border-[#2962ff]'
              : 'bg-[#1e222d] text-[#d1d4dc] border-[#2a2e39] hover:bg-[#252936]'
          }`}
          title="Toggle debug info"
        >
          Debug
        </button>
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
