'use client'

import { useMemo } from 'react'
import { useThemeClasses } from '@/shared/hooks'
import { formatRelativeTime } from '@/shared/lib/formatting/date'
import { formatAmountForDisplay, formatPriceForDisplay } from '../../lib/formatAmount'
import type { TradeItem } from '../../model/useTradeHistorySorting'
import { User } from 'lucide-react'

interface TradeHistoryRowProps {
  trade: TradeItem
}

// Helper functions to extract trade data
function getTradeTimestamp(trade: TradeItem): number {
  if ('timestamp' in trade) return trade.timestamp ?? 0
  if ('trade_timestamp' in trade) return (trade.trade_timestamp || 0) * 1000
  return 0
}

function getTradePrice(trade: TradeItem): number {
  return 'price' in trade ? (trade.price ?? 0) : 0
}

function getTradeVolume(trade: TradeItem): number {
  if ('volume' in trade) return trade.volume ?? 0
  if ('base_volume' in trade) return trade.base_volume ?? 0
  return 0
}

function getTradeType(trade: TradeItem): 'buy' | 'sell' {
  if ('type' in trade) return trade.type as 'buy' | 'sell'
  if ('side' in trade) return trade.side as 'buy' | 'sell'
  return 'buy'
}

function getTradeSymbol(trade: TradeItem): string {
  if ('symbol' in trade) return trade.symbol
  if ('ticker_id' in trade) return trade.ticker_id?.split('_')[0] || 'N/A'
  return 'N/A'
}

export default function TradeHistoryRow({ trade }: TradeHistoryRowProps) {
  const { t, isDark } = useThemeClasses()

  // Extract trade data (handles both TradeHistoryItem and DexieHistoricalTrade)
  const timestamp = getTradeTimestamp(trade)
  const price = getTradePrice(trade)
  const volume = getTradeVolume(trade)
  const totalValue = 'totalValue' in trade ? (trade.totalValue ?? 0) : price * volume
  const tradeType = getTradeType(trade)
  const symbol = getTradeSymbol(trade)
  const isMyTrade = 'isMyTrade' in trade ? trade.isMyTrade : false
  const profitLoss = 'profitLoss' in trade ? trade.profitLoss : undefined
  const profitLossPercent = 'profitLossPercent' in trade ? trade.profitLossPercent : undefined

  // Format date/time
  const dateTime = useMemo(() => {
    if (!timestamp) return 'N/A'
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [timestamp])

  const relativeTime = useMemo(() => {
    if (!timestamp) return ''
    return formatRelativeTime(timestamp)
  }, [timestamp])

  // Type color
  const typeColorClass = tradeType === 'buy' 
    ? 'text-green-600 dark:text-green-400' 
    : 'text-red-600 dark:text-red-400'

  // P/L color
  const plColorClass = useMemo(() => {
    if (profitLoss === undefined || profitLoss === null) return t.textSecondary
    return profitLoss >= 0
      ? 'text-green-600 dark:text-green-400'
      : 'text-red-600 dark:text-red-400'
  }, [profitLoss, t.textSecondary])

  // Row background for my trades
  const rowBgClass = isMyTrade
    ? isDark
      ? 'bg-blue-500/5 hover:bg-blue-500/10'
      : 'bg-blue-500/10 hover:bg-blue-500/15'
    : 'hover:bg-white/5 dark:hover:bg-white/5'

  return (
    <div
      className={`grid grid-cols-12 gap-2 px-3 py-2 border-b ${t.border} ${rowBgClass} transition-colors ${
        isMyTrade ? 'border-l-2 border-l-blue-500/30' : ''
      }`}
    >
      {/* Date/Time */}
      <div className={`text-xs ${t.text} flex flex-col`}>
        <span>{dateTime}</span>
        <span className={`text-[10px] ${t.textSecondary}`}>{relativeTime}</span>
      </div>

      {/* Price */}
      <div className={`text-xs font-mono ${t.text}`}>
        {formatPriceForDisplay(price)}
      </div>

      {/* Volume */}
      <div className={`text-xs font-mono ${t.text}`}>
        {formatAmountForDisplay(volume)}
      </div>

      {/* Total Value */}
      <div className={`text-xs font-mono ${t.text}`}>
        {formatAmountForDisplay(totalValue)}
      </div>

      {/* Type */}
      <div className={`text-xs font-medium ${typeColorClass} col-span-2`}>
        {tradeType.toUpperCase()}
      </div>

      {/* Symbol */}
      <div className={`text-xs ${t.text} col-span-2`}>
        {symbol}
      </div>

      {/* P/L */}
      <div className={`text-xs font-mono ${plColorClass} col-span-2`}>
        {profitLoss !== undefined && profitLoss !== null ? (
          <div className="flex flex-col">
            <span>{profitLoss >= 0 ? '+' : ''}{formatAmountForDisplay(profitLoss)}</span>
            {profitLossPercent !== undefined && (
              <span className="text-[10px]">
                {profitLossPercent >= 0 ? '+' : ''}{profitLossPercent.toFixed(2)}%
              </span>
            )}
          </div>
        ) : (
          <span className={t.textSecondary}>—</span>
        )}
      </div>

      {/* My Trade Indicator */}
      <div className="flex items-center justify-center col-span-1" title={isMyTrade ? 'My Trade' : undefined}>
        {isMyTrade && (
          <User
            className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
          />
        )}
      </div>
    </div>
  )
}
