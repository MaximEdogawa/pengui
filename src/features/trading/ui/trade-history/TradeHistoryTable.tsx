'use client'

import { useThemeClasses } from '@/shared/hooks'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import type { SortColumn, SortConfig, TradeItem } from '../../model/useTradeHistorySorting'
import TradeHistoryRow from './TradeHistoryRow'

interface TradeHistoryTableProps {
  trades: TradeItem[]
  sortConfig: SortConfig
  onSort: (column: SortColumn) => void
}

export default function TradeHistoryTable({ trades, sortConfig, onSort }: TradeHistoryTableProps) {
  const { t } = useThemeClasses()

  const getSortIcon = (column: SortColumn) => {
    if (sortConfig.column !== column) {
      return <ArrowUpDown className="w-3 h-3 opacity-50" />
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="w-3 h-3" />
    ) : (
      <ArrowDown className="w-3 h-3" />
    )
  }

  const headerCellClass = `px-3 py-2 text-xs font-medium ${t.textSecondary} cursor-pointer hover:${t.text} transition-colors flex items-center gap-1`

  if (trades.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full ${t.textSecondary}`}>
        <p className="text-sm">No trades found</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div
        className={`sticky top-0 z-10 backdrop-blur-xl ${t.card} border-b ${t.border} grid grid-cols-12 gap-2`}
        style={{
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        }}
      >
        <div className={headerCellClass} onClick={() => onSort('date')}>
          Date/Time
          {getSortIcon('date')}
        </div>
        <div className={headerCellClass} onClick={() => onSort('price')}>
          Price
          {getSortIcon('price')}
        </div>
        <div className={headerCellClass} onClick={() => onSort('volume')}>
          Volume
          {getSortIcon('volume')}
        </div>
        <div className={headerCellClass} onClick={() => onSort('totalValue')}>
          Total
          {getSortIcon('totalValue')}
        </div>
        <div className={`${headerCellClass} col-span-2`}>
          Type
        </div>
        <div className={`${headerCellClass} col-span-2`}>
          Symbol
        </div>
        <div className={`${headerCellClass} col-span-2`} onClick={() => onSort('profitLoss')}>
          P/L
          {getSortIcon('profitLoss')}
        </div>
        <div className={`${headerCellClass} col-span-1`}>
          {/* My Trade indicator column */}
        </div>
      </div>

      {/* Rows */}
      <div>
        {trades.map((trade, index) => (
          <TradeHistoryRow key={`${trade.trade_id || index}-${trade.timestamp || index}`} trade={trade} />
        ))}
      </div>
    </div>
  )
}
