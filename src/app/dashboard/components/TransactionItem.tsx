'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'
import type { ThemeClasses } from '@/shared/lib/theme'

interface Transaction {
  id: number
  name: string
  amount: number
  type: 'income' | 'expense'
  date: string
}

interface TransactionItemProps {
  transaction: Transaction
  isDark: boolean
  t: ThemeClasses
}

export function TransactionItem({ transaction, isDark, t }: TransactionItemProps) {
  const isIncome = transaction.type === 'income'
  const iconBgColor = isIncome
    ? isDark
      ? 'bg-emerald-500/10'
      : 'bg-emerald-500/20'
    : isDark
      ? 'bg-rose-500/10'
      : 'bg-rose-500/20'
  const iconColor = isIncome
    ? isDark
      ? 'text-emerald-400'
      : 'text-emerald-600'
    : isDark
      ? 'text-rose-400'
      : 'text-rose-600'
  const amountColor = isIncome
    ? isDark
      ? 'text-emerald-400'
      : 'text-emerald-600'
    : isDark
      ? 'text-rose-400'
      : 'text-rose-600'

  return (
    <div
      className={`backdrop-blur-xl ${isDark ? 'bg-white/[0.03] border-white/5 hover:bg-white/[0.05]' : 'bg-white/50 border-cyan-200/30 hover:bg-white/70'} rounded-xl p-3 border transition-all duration-200`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-lg backdrop-blur-sm ${iconBgColor}`}>
            {isIncome ? (
              <TrendingUp className={iconColor} size={14} strokeWidth={2} />
            ) : (
              <TrendingDown className={iconColor} size={14} strokeWidth={2} />
            )}
          </div>
          <div>
            <p className={`${t.text} font-medium text-xs`}>{transaction.name}</p>
            <p className={`${t.textTertiary} text-[10px] font-medium mt-0.5`}>
              {transaction.date}
            </p>
          </div>
        </div>
        <p className={`text-sm font-semibold ${amountColor}`}>
          {isIncome ? '+' : ''}
          {transaction.amount > 0 ? '$' : '-$'}
          {Math.abs(transaction.amount).toLocaleString()}
        </p>
      </div>
    </div>
  )
}
