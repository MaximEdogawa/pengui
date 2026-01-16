'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { getThemeClasses } from '@/shared/lib/theme'
import { BalanceCard } from './components/BalanceCard'
import { StatsGrid } from './components/StatsGrid'
import { TransactionList } from './components/TransactionList'

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false)
  const { theme: currentTheme, systemTheme } = useTheme()

  const isDark = currentTheme === 'dark' || (currentTheme === 'system' && systemTheme === 'dark')
  const t = getThemeClasses(isDark)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const transactions = [
    { id: 1, name: 'Investment Return', amount: 2400, type: 'income' as const, date: 'Today' },
    { id: 2, name: 'Dividend Payment', amount: 850, type: 'income' as const, date: 'Yesterday' },
    { id: 3, name: 'Portfolio Rebalance', amount: -1200, type: 'expense' as const, date: '2 days ago' },
    { id: 4, name: 'Stock Purchase', amount: -3500, type: 'expense' as const, date: '3 days ago' },
  ]

  return (
    <div className="w-full relative z-10">
      <BalanceCard isDark={isDark} t={t} />
      <StatsGrid isDark={isDark} t={t} />
      <TransactionList transactions={transactions} isDark={isDark} t={t} />
    </div>
  )
}
