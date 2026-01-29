'use client'

import type { ThemeClasses } from '@/shared/lib/theme'
import { TransactionItem } from './TransactionItem'

interface Transaction {
  id: number
  name: string
  amount: number
  type: 'income' | 'expense'
  date: string
}

interface TransactionListProps {
  transactions: Transaction[]
  isDark: boolean
  t: ThemeClasses
}

export function TransactionList({ transactions, isDark, t }: TransactionListProps) {
  return (
    <div
      className={`backdrop-blur-[40px] ${t.card} rounded-2xl p-3 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 ${
        isDark ? 'bg-white/[0.03]' : 'bg-white/30'
      }`}
    >
      <h3 className={`${t.text} text-sm font-semibold mb-2`}>Recent Transactions</h3>
      <div className="space-y-1.5">
        {transactions.map((transaction) => (
          <TransactionItem
            key={transaction.id}
            transaction={transaction}
            isDark={isDark}
            t={t}
          />
        ))}
      </div>
    </div>
  )
}
