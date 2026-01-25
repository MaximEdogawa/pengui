'use client'

import { useThemeClasses } from '@/shared/hooks'
import { useNetwork } from '@/shared/hooks/useNetwork'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import type { SortColumn, SortConfig } from '../../model/useTradeHistorySorting'
import type { TradeHistoryOfferItem } from '../../model/useTradeHistory'
import type { OrderBookOrder } from '../../lib/orderBookTypes'
import type { DexieOffer } from '@/entities/offer'
import { convertDexieOfferToOrderBookOrder } from '../../lib/orderBookConverters'
import TradeHistoryRow from './TradeHistoryRow'

interface TradeHistoryTableProps {
  offers: TradeHistoryOfferItem[]
  sortConfig: SortConfig
  onSort: (column: SortColumn) => void
  onOfferClick?: (order: OrderBookOrder) => void
}

export default function TradeHistoryTable({
  offers,
  sortConfig,
  onSort,
  onOfferClick,
}: TradeHistoryTableProps) {
  const { t } = useThemeClasses()
  const { network } = useNetwork()

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

  const hoverClass = t.text === 'text-slate-700' ? 'hover:text-slate-800' : 'hover:text-slate-200'
  const headerCellClass = `px-3 py-2 text-xs font-medium ${t.textSecondary} cursor-pointer ${hoverClass} transition-colors flex items-center gap-1`

  if (offers.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full ${t.textSecondary}`}>
        <p className="text-sm">No offers found</p>
      </div>
    )
  }

  const handleOfferClick = (item: TradeHistoryOfferItem) => {
    if (!onOfferClick) return

    const { offer } = item
    const orderBookOrder = convertDexieOfferToOrderBookOrder(offer as DexieOffer, network)
    onOfferClick(orderBookOrder)
  }

  return (
    <div className="w-full">
      <div
        className={`sticky top-0 z-10 backdrop-blur-xl ${t.card} border-b ${t.border} grid grid-cols-8 gap-2`}
        style={{
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        }}
      >
        <div className={`${headerCellClass} col-span-2`} onClick={() => onSort('requested')}>
          Requested
          {getSortIcon('requested')}
        </div>
        <div className={`${headerCellClass} col-span-2`} onClick={() => onSort('offered')}>
          Offered
          {getSortIcon('offered')}
        </div>
        <div className={headerCellClass} onClick={() => onSort('price')}>
          Price
          {getSortIcon('price')}
        </div>
        <div className={`${headerCellClass} col-span-2`} onClick={() => onSort('date')}>
          Date
          {getSortIcon('date')}
        </div>
        <div className={headerCellClass} onClick={() => onSort('status')}>
          Status
          {getSortIcon('status')}
        </div>
      </div>

      <div>
        {offers.map((item, index) => (
          <TradeHistoryRow 
            key={`${item.offer.id}-${index}`} 
            item={item} 
            onClick={() => handleOfferClick(item)}
          />
        ))}
      </div>
    </div>
  )
}
