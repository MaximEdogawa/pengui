'use client'

import { useMemo } from 'react'
import { useThemeClasses } from '@/shared/hooks'
import { useOrderBookFilters } from '../../model/OrderBookFiltersProvider'
import { useTradeHistory } from '../../model/useTradeHistory'
import { useTradeHistorySorting } from '../../model/useTradeHistorySorting'
import TradeHistoryTable from './TradeHistoryTable'
import TradeHistoryFilters from './TradeHistoryFilters'
import TradeHistoryPagination from './TradeHistoryPagination'
import { Loader2 } from 'lucide-react'

export default function TradeHistoryContainer() {
  const { t } = useThemeClasses()
  const { filters: orderBookFilters } = useOrderBookFilters()
  const { trades, isLoading, error, tickerId } = useTradeHistory({
    filters: orderBookFilters,
  })
  const { sortTrades, sortConfig, setSort } = useTradeHistorySorting()

  // Sort trades
  const sortedTrades = useMemo(() => {
    return sortTrades(trades)
  }, [trades, sortTrades])

  if (error) {
    return (
      <div className={`${t.card} p-4 h-full flex flex-col items-center justify-center`}>
        <p className={`${t.textSecondary} text-sm`}>
          Error loading trade history. Please try again.
        </p>
      </div>
    )
  }

  if (!tickerId) {
    return (
      <div className={`${t.card} p-4 h-full flex flex-col items-center justify-center`}>
        <p className={`${t.textSecondary} text-sm`}>
          Please select an asset pair to view trade history
        </p>
      </div>
    )
  }

  return (
    <div className={`${t.card} h-full flex flex-col overflow-hidden`}>
      {/* Filters */}
      <div className={`flex-shrink-0 border-b ${t.border}`}>
        <TradeHistoryFilters />
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400 dark:text-gray-500" />
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading trades...</span>
          </div>
        ) : (
          <TradeHistoryTable
            trades={sortedTrades}
            sortConfig={sortConfig}
            onSort={setSort}
          />
        )}
      </div>

      {/* Pagination */}
      {!isLoading && sortedTrades.length > 0 && (
        <div className={`flex-shrink-0 border-t ${t.border}`}>
          <TradeHistoryPagination totalTrades={sortedTrades.length} />
        </div>
      )}
    </div>
  )
}
