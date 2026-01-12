'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  PieChart,
  DollarSign,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { getThemeClasses } from '@/shared/lib/theme'

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
    { id: 1, name: 'Investment Return', amount: 2400, type: 'income', date: 'Today' },
    { id: 2, name: 'Dividend Payment', amount: 850, type: 'income', date: 'Yesterday' },
    { id: 3, name: 'Portfolio Rebalance', amount: -1200, type: 'expense', date: '2 days ago' },
    { id: 4, name: 'Stock Purchase', amount: -3500, type: 'expense', date: '3 days ago' },
  ]

  return (
    <div className="w-full relative z-10">
      {/* Balance Card */}
      <div
        className={`mb-2 backdrop-blur-[40px] ${t.card} rounded-2xl p-3 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 ${
          isDark ? 'bg-white/[0.03]' : 'bg-white/30'
        }`}
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <p
              className={`${t.textSecondary} text-[10px] font-medium mb-2 uppercase tracking-wide`}
            >
              Total Balance
            </p>
            <h2 className={`text-2xl lg:text-3xl font-semibold ${t.text} tracking-tight`}>
              $47,892.50
            </h2>
          </div>
          <div
            className={`backdrop-blur-xl ${isDark ? 'bg-emerald-500/10 border-emerald-400/20' : 'bg-emerald-500/15 border-emerald-600/20'} px-3 py-1.5 rounded-full border transition-all duration-300`}
          >
            <div
              className={`flex items-center gap-1.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}
            >
              <TrendingUp size={14} strokeWidth={2.5} />
              <span className="font-semibold text-xs">+12.5%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
        <div
          className={`backdrop-blur-[40px] ${t.card} rounded-2xl p-3 border ${t.border} ${t.cardHover} transition-all duration-200 cursor-pointer shadow-lg shadow-black/5 ${
            isDark ? 'bg-white/[0.03]' : 'bg-white/30'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div
              className={`p-2 rounded-xl ${isDark ? 'bg-cyan-500/10' : 'bg-cyan-600/15'} backdrop-blur-sm`}
            >
              <Wallet
                className={`${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}
                size={16}
                strokeWidth={2}
              />
            </div>
            <ArrowUpRight
              className={`${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}
              size={14}
              strokeWidth={2.5}
            />
          </div>
          <p className={`${t.textTertiary} text-[10px] font-medium mb-1.5 uppercase tracking-wide`}>
            Investments
          </p>
          <p className={`${t.text} text-xl font-semibold mb-1`}>$32,450</p>
          <p
            className={`${isDark ? 'text-emerald-400' : 'text-emerald-600'} text-[10px] font-medium`}
          >
            +8.2% this month
          </p>
        </div>

        <div
          className={`backdrop-blur-[40px] ${t.card} rounded-2xl p-4 border ${t.border} ${t.cardHover} transition-all duration-200 cursor-pointer shadow-lg shadow-black/5 ${
            isDark ? 'bg-white/[0.03]' : 'bg-white/30'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div
              className={`p-2 rounded-xl ${isDark ? 'bg-blue-500/10' : 'bg-blue-600/15'} backdrop-blur-sm`}
            >
              <PieChart
                className={`${isDark ? 'text-blue-400' : 'text-blue-700'}`}
                size={16}
                strokeWidth={2}
              />
            </div>
            <ArrowUpRight
              className={`${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}
              size={14}
              strokeWidth={2.5}
            />
          </div>
          <p className={`${t.textTertiary} text-[10px] font-medium mb-1.5 uppercase tracking-wide`}>
            Portfolio
          </p>
          <p className={`${t.text} text-xl font-semibold mb-1`}>$12,340</p>
          <p
            className={`${isDark ? 'text-emerald-400' : 'text-emerald-600'} text-[10px] font-medium`}
          >
            +15.7% this month
          </p>
        </div>

        <div
          className={`backdrop-blur-[40px] ${t.card} rounded-2xl p-4 border ${t.border} ${t.cardHover} transition-all duration-200 cursor-pointer shadow-lg shadow-black/5 ${
            isDark ? 'bg-white/[0.03]' : 'bg-white/30'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div
              className={`p-2 rounded-xl ${isDark ? 'bg-sky-500/10' : 'bg-sky-500/20'} backdrop-blur-sm`}
            >
              <DollarSign
                className={`${isDark ? 'text-sky-400' : 'text-sky-600'}`}
                size={16}
                strokeWidth={2}
              />
            </div>
            <ArrowDownRight
              className={`${isDark ? 'text-rose-400' : 'text-rose-600'}`}
              size={14}
              strokeWidth={2.5}
            />
          </div>
          <p className={`${t.textTertiary} text-[10px] font-medium mb-1.5 uppercase tracking-wide`}>
            Expenses
          </p>
          <p className={`${t.text} text-xl font-semibold mb-1`}>$3,102</p>
          <p className={`${isDark ? 'text-rose-400' : 'text-rose-600'} text-[10px] font-medium`}>
            -3.1% this month
          </p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div
        className={`backdrop-blur-[40px] ${t.card} rounded-2xl p-3 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 ${
          isDark ? 'bg-white/[0.03]' : 'bg-white/30'
        }`}
      >
        <h3 className={`${t.text} text-sm font-semibold mb-2`}>Recent Transactions</h3>
        <div className="space-y-1.5">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className={`backdrop-blur-xl ${isDark ? 'bg-white/[0.03] border-white/5 hover:bg-white/[0.05]' : 'bg-white/50 border-cyan-200/30 hover:bg-white/70'} rounded-xl p-3 border transition-all duration-200`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-1.5 rounded-lg backdrop-blur-sm ${
                      transaction.type === 'income'
                        ? isDark
                          ? 'bg-emerald-500/10'
                          : 'bg-emerald-500/20'
                        : isDark
                          ? 'bg-rose-500/10'
                          : 'bg-rose-500/20'
                    }`}
                  >
                    {transaction.type === 'income' ? (
                      <TrendingUp
                        className={`${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}
                        size={14}
                        strokeWidth={2}
                      />
                    ) : (
                      <TrendingDown
                        className={`${isDark ? 'text-rose-400' : 'text-rose-600'}`}
                        size={14}
                        strokeWidth={2}
                      />
                    )}
                  </div>
                  <div>
                    <p className={`${t.text} font-medium text-xs`}>{transaction.name}</p>
                    <p className={`${t.textTertiary} text-[10px] font-medium mt-0.5`}>
                      {transaction.date}
                    </p>
                  </div>
                </div>
                <p
                  className={`text-sm font-semibold ${
                    transaction.type === 'income'
                      ? isDark
                        ? 'text-emerald-400'
                        : 'text-emerald-600'
                      : isDark
                        ? 'text-rose-400'
                        : 'text-rose-600'
                  }`}
                >
                  {transaction.type === 'income' ? '+' : ''}
                  {transaction.amount > 0 ? '$' : '-$'}
                  {Math.abs(transaction.amount).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
