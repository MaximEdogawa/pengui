"use client";

import { useState, useMemo } from "react";
import { BarChart3, LineChart, User } from "lucide-react";
import { LightweightChart } from "./LightweightChart";
import { useTickers } from "@/entities/asset/hooks/useTickers";
import { ChartConfig, Timeframe } from "@/features/trading/lib/chartTypes";
import { useOrderBookFilters } from "@/features/trading/hooks";
import { usePriceChart } from "@/features/trading/hooks/usePriceChart";
import { resolveTickerId } from "@/features/trading/lib/tickerResolution";
import { useMyTrades } from "@/features/trading/hooks/useMyTrades";

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

export default function PriceChart() {
  const [config, setConfig] = useState<ChartConfig>(DEFAULT_CONFIG);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const { filters: orderBookFilters } = useOrderBookFilters();
  const { data: tickersData } = useTickers();
  const tickers = useMemo(() => tickersData?.data || [], [tickersData?.data]);

  const { ohlcData, isLoadingOHLC, isErrorOHLC, ohlcError, indicators, isUsingSyntheticData } =
    usePriceChart({ config, isUserScrolling });

  // Get ticker ID for my trades
  const tickerId = useMemo(() => {
    if (!orderBookFilters) return null;
    return resolveTickerId(orderBookFilters, tickers);
  }, [orderBookFilters, tickers]);

  // Get my trades for current asset pair
  const { myTrades } = useMyTrades({
    tickerId: tickerId || undefined,
  });

  // Check if user has trades for this asset pair
  const hasMyTrades = useMemo(() => {
    return myTrades.length > 0;
  }, [myTrades]);

  const updateConfig = (updates: Partial<ChartConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  if (isLoadingOHLC) return <LoadingState />;
  if (isErrorOHLC) return <ErrorState error={ohlcError} />;

  // Always show the chart, even if there's no data - it will display empty gracefully
  return (
    <div className="h-full flex flex-col relative bg-[#131722]">
      {/* My Trades Indicator */}
      {hasMyTrades && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2 py-1 backdrop-blur-xl bg-blue-500/20 border border-blue-400/30 rounded-lg shadow-lg">
          <User className="w-3 h-3 text-blue-400" />
          <span className="text-xs text-blue-400 font-medium">
            {myTrades.length} {myTrades.length === 1 ? "Trade" : "Trades"}
          </span>
        </div>
      )}

      <div className="absolute top-2 sm:top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 sm:gap-2">
        {/* Chart Type Toggle - Glass morphism style */}
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

        <select
          value={config.timeframe}
          onChange={(e) => updateConfig({ timeframe: e.target.value as Timeframe })}
          className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-md bg-[#1e222d] border border-[#2a2e39] text-[#d1d4dc] hover:bg-[#252936] focus:outline-none focus:ring-2 focus:ring-[#2962ff]/50 transition-colors`}
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
  );
}
