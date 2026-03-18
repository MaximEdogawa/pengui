"use client";

import { useMemo, useRef, useEffect } from "react";
import { useThemeClasses } from "@/shared/hooks";
import TradeHistoryTable from "./TradeHistoryTable";
import { Loader2 } from "lucide-react";
import { OrderBookOrder } from "@/features/trading/lib/orderBookTypes";
import { useOrderBookFilters } from "@/features/trading/hooks/useOrderBookFilters";
import {
  useTradeHistory,
  type TradeHistoryResult,
} from "@/features/trading/hooks/useTradeHistory";
import { useTradeHistoryFilters } from "@/features/trading/hooks/useTradeHistoryFilters";
import { useTradeHistorySorting } from "@/features/trading/hooks/useTradeHistorySorting";

interface TradeHistoryContainerProps {
  /**
   * Optional injected trade history result.
   * When omitted, the container falls back to creating its own queries
   * (backwards-compatible usage, e.g. in Storybook).
   */
  tradeHistoryResult?: TradeHistoryResult;
  onOfferClick?: (order: OrderBookOrder) => void;
}

export default function TradeHistoryContainer({
  tradeHistoryResult,
  onOfferClick,
}: TradeHistoryContainerProps) {
  const { t } = useThemeClasses();
  const { filters: orderBookFilters } = useOrderBookFilters();
  const {
    filters: thFilters,
    setMyTradesOnly,
    setShowOpen,
    setShowCompleted,
    setShowCancelled,
    setShowPending,
  } = useTradeHistoryFilters();

  // Always create a local result to satisfy hook rules; prefer injected
  // result when provided (from TradingContent).
  const fallbackResult = useTradeHistory({
    orderBookFilters,
    tradeHistoryFilters: thFilters,
  });

  const localResult = tradeHistoryResult ?? fallbackResult;

  const {
    offers,
    isLoading,
    error,
    hasPairFilter,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = localResult;
  const { sortTrades, sortConfig, setSort } = useTradeHistorySorting();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const sortedOffers = useMemo(() => sortTrades(offers), [offers, sortTrades]);

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchNextPage();
      },
      { root: null, rootMargin: "200px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (error) {
    return (
      <div
        className={`${t.card} p-4 h-full flex flex-col items-center justify-center`}
      >
        <p className={`${t.textSecondary} text-sm`}>
          Error loading trade history. Please try again.
        </p>
      </div>
    );
  }

  if (!hasPairFilter) {
    return (
      <div
        className={`${t.card} p-4 h-full flex flex-col items-center justify-center`}
      >
        <p className={`${t.textSecondary} text-sm`}>
          Please select an asset pair to view trade history
        </p>
      </div>
    );
  }

  return (
    <div className={`${t.card} h-full flex flex-col overflow-hidden`}>
      {/* All | Mine (small) + Status checkboxes */}
      <div
        className={`flex-shrink-0 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 px-1.5 sm:px-2 py-1 sm:py-1.5 border-b ${t.border}`}
      >
        {/* All | Mine - smaller pill */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-white/10 dark:border-white/5">
          <button
            onClick={() => setMyTradesOnly(false)}
            className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-medium rounded-md transition-all duration-200 ${
              !thFilters.myTradesOnly
                ? "bg-white/20 dark:bg:white/10 text-slate-800 dark:text-slate-100"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setMyTradesOnly(true)}
            className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-medium rounded-md transition-all duration-200 ${
              thFilters.myTradesOnly
                ? "bg-white/20 dark:bg-white/10 text-slate-800 dark:text-slate-100"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Mine
          </button>
        </div>

        {/* Status checkboxes - glass */}
        <div
          className={`flex items-center gap-2 sm:gap-3 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg backdrop-blur-xl bg:white/5 dark:bg-black/5 border border-white/10 dark:border-white/5 ${t.text}`}
        >
          <label className="flex items-center gap-1 sm:gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={thFilters.showOpen}
              onChange={(e) => setShowOpen(e.target.checked)}
              className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded border-gray-400 dark:border-gray-500"
            />
            <span className="text-[10px] sm:text-[11px]">Open</span>
          </label>
          <label className="flex items-center gap-1 sm:gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={thFilters.showPending}
              onChange={(e) => setShowPending(e.target.checked)}
              className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded border-gray-400 dark:border-gray-500"
            />
            <span className="text-[10px] sm:text-[11px]">Pending</span>
          </label>
          <label className="flex items-center gap-1 sm:gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={thFilters.showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded border-gray-400 dark:border-gray-500"
            />
            <span className="text-[10px] sm:text-[11px]">Done</span>
          </label>
          <label className="flex items-center gap-1 sm:gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={thFilters.showCancelled}
              onChange={(e) => setShowCancelled(e.target.checked)}
              className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded border-gray-400 dark:border-gray-500"
            />
            <span className="text-[10px] sm:text-[11px]">Cancel</span>
          </label>
        </div>
      </div>

      {/* Table + infinite scroll */}
      <div className="flex-1 min-h-0 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400 dark:text-gray-500" />
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
              Loading offers...
            </span>
          </div>
        ) : (
          <>
            <TradeHistoryTable
              offers={sortedOffers}
              sortConfig={sortConfig}
              onSort={setSort}
              onOfferClick={onOfferClick}
            />
            <div ref={sentinelRef} className="h-4 flex-shrink-0" aria-hidden />
            {isFetchingNextPage && (
              <div
                className={`flex items-center justify-center py-3 ${t.textSecondary}`}
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="ml-2 text-xs">Loading more...</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
