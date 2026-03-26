"use client";

import { useState, useMemo } from "react";
import { useAssetPriceChart } from "../hooks/useAssetPriceChart";
import { LightweightChart } from "@/features/trading/ui/widgets/chart/LightweightChart";
import { calculateIndicatorsFromOHLC } from "@/features/trading/lib/indicators";
import type { ChartConfig, Timeframe } from "@/features/trading/lib/chartTypes";
import { BarChart3, LineChart } from "lucide-react";

interface AssetPriceChartProps {
  assetId: string;
  ticker: string;
}

const DEFAULT_CONFIG: ChartConfig = {
  chartType: "candlestick",
  timeframe: "1h",
  indicators: {
    sma: { enabled: false, periods: [20, 50] },
    ema: { enabled: false, periods: [20, 50] },
    volume: true,
    rsi: false,
    macd: false,
    bollingerBands: false,
  },
};

const TIMEFRAMES: Timeframe[] = ["1m", "15m", "1h", "4h", "1D", "1W", "1M"];

const EMPTY_INDICATORS = {
  sma: {} as Record<number, number[]>,
  ema: {} as Record<number, number[]>,
  rsi: [] as number[],
  macd: [] as Array<{ time: number; macd: number; signal: number; histogram: number }>,
  bollingerBands: [] as Array<{ time: number; upper: number; middle: number; lower: number }>,
};

function LoadingState() {
  return (
    <div className="h-full flex items-center justify-center bg-[#131722]">
      <p className="text-[#d1d4dc]">Loading...</p>
    </div>
  );
}

function ErrorState({ error }: { error?: unknown }) {
  const errorMessage = error instanceof Error ? error.message : error ? String(error) : null;

  return (
    <div className="h-full flex flex-col items-center justify-center p-4 bg-[#131722]">
      <p className="text-[#ef5350] mb-2">Error loading chart data</p>
      {errorMessage && <p className="text-xs text-[#868993]">{errorMessage}</p>}
    </div>
  );
}

export default function AssetPriceChart({ assetId }: AssetPriceChartProps) {
  const [config, setConfig] = useState<ChartConfig>(DEFAULT_CONFIG);
  const [_isUserScrolling, setIsUserScrolling] = useState(false);

  const { ohlcData, isLoading, isError, error, hasChart } = useAssetPriceChart(
    assetId,
    config.timeframe
  );

  const indicators = useMemo(() => {
    if (ohlcData.length === 0) return EMPTY_INDICATORS;
    return calculateIndicatorsFromOHLC(ohlcData, {
      sma: config.indicators.sma.enabled ? config.indicators.sma.periods : undefined,
      ema: config.indicators.ema.enabled ? config.indicators.ema.periods : undefined,
      rsi: config.indicators.rsi,
      macd: config.indicators.macd,
      bollingerBands: config.indicators.bollingerBands,
    });
  }, [ohlcData, config.indicators]);

  const updateConfig = (updates: Partial<ChartConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  if (!hasChart) return null;

  if (isLoading)
    return (
      <div className="h-[200px] sm:h-[260px] rounded-xl overflow-hidden">
        <LoadingState />
      </div>
    );
  if (isError)
    return (
      <div className="h-[200px] sm:h-[260px] rounded-xl overflow-hidden">
        <ErrorState error={error} />
      </div>
    );

  return (
    <div className="h-[200px] sm:h-[260px] rounded-xl overflow-hidden flex flex-col relative bg-[#131722] [&_*]:!min-h-0">
      {/* Controls — same layout as trading PriceChart */}
      <div className="absolute top-2 sm:top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 sm:gap-2">
        {/* Chart Type Toggle */}
        <div className="flex items-center gap-0.5 p-0.5 backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg shadow-lg">
          <button
            onClick={() => updateConfig({ chartType: "candlestick" })}
            className={`p-1 sm:p-1.5 rounded-md transition-all duration-200 ${
              config.chartType === "candlestick"
                ? "bg-white/20 text-white shadow-sm"
                : "text-white/60 hover:text-white/80 hover:bg-white/5"
            }`}
            title="Candlestick Chart"
          >
            <BarChart3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={2} />
          </button>
          <button
            onClick={() => updateConfig({ chartType: "line" })}
            className={`p-1 sm:p-1.5 rounded-md transition-all duration-200 ${
              config.chartType === "line"
                ? "bg-white/20 text-white shadow-sm"
                : "text-white/60 hover:text-white/80 hover:bg-white/5"
            }`}
            title="Line Chart"
          >
            <LineChart className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={2} />
          </button>
        </div>

        {/* Timeframe dropdown */}
        <select
          value={config.timeframe}
          onChange={(e) => updateConfig({ timeframe: e.target.value as Timeframe })}
          className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-md bg-[#1e222d] border border-[#2a2e39] text-[#d1d4dc] hover:bg-[#252936] focus:outline-none focus:ring-2 focus:ring-[#2962ff]/50 transition-colors"
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
        isUsingSyntheticData={false}
        onScrollingChange={setIsUserScrolling}
      />
    </div>
  );
}
