'use client'

import { useThemeClasses } from '@/shared/hooks'
import { formatAmountForDisplay, formatPriceForDisplay } from '../../lib/formatAmount'
import type { TradeHistoryOfferItem } from '../../model/useTradeHistory'
import type { DexieOffer } from '@/entities/offer'

interface TradeHistoryRowProps {
  item: TradeHistoryOfferItem
}

function formatOfferDate(offer: DexieOffer): string {
  const d = offer.date_completed
    ? new Date(offer.date_completed)
    : offer.date_pending
      ? new Date(offer.date_pending)
      : new Date(offer.date_found)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}:${s}`
}

function formatAssetAmount(amount: number | undefined | null, code: string): string {
  if (amount == null || typeof amount !== 'number' || Number.isNaN(amount)) return '—'
  return `${formatAmountForDisplay(amount)} ${code || ''}`.trim()
}

export default function TradeHistoryRow({ item }: TradeHistoryRowProps) {
  const { t, isDark } = useThemeClasses()
  const { offer, offerState, isMyOffer } = item

  const requested = offer.requested?.[0]
  const offered = offer.offered?.[0]
  const price = offer.price ?? (offered?.amount && requested?.amount
    ? requested.amount / offered.amount
    : 0)

  const rowBgClass = isMyOffer
    ? isDark
      ? 'bg-blue-500/5 hover:bg-blue-500/10'
      : 'bg-blue-500/10 hover:bg-blue-500/15'
    : 'hover:bg-white/5 dark:hover:bg-white/5'

  return (
    <div
      className={`grid grid-cols-8 gap-2 px-3 py-2 border-b ${t.border} ${rowBgClass} transition-colors ${
        isMyOffer ? 'border-l-2 border-l-blue-500/30' : ''
      }`}
    >
      <div className={`text-xs font-mono ${t.text} col-span-2`}>
        {requested ? formatAssetAmount(requested.amount, requested.code ?? '') : '—'}
      </div>
      <div className={`text-xs font-mono ${t.text} col-span-2`}>
        {offered ? formatAssetAmount(offered.amount, offered.code ?? '') : '—'}
      </div>
      <div className={`text-xs font-mono ${t.text}`}>
        {formatPriceForDisplay(price)}
      </div>
      <div className={`text-xs ${t.text} col-span-2`}>
        {formatOfferDate(offer)}
      </div>
      <div className={`text-xs ${t.text} flex items-center gap-1.5 flex-wrap`}>
        <span>{offerState}</span>
        {isMyOffer && (
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
              isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-500/25 text-blue-600'
            }`}
          >
            Mine
          </span>
        )}
      </div>
    </div>
  )
}
