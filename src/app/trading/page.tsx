'use client'

import { getThemeClasses } from '@/shared/lib/theme'
import { TrendingUp, BookOpen, BarChart3, Activity, type LucideIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import TradingLayout from '@/features/trading/ui/layout/TradingLayout'
import FilterPanel from '@/features/trading/ui/layout/FilterPanel'
import {
  OrderBookFiltersProvider,
  useOrderBookFilters,
} from '@/features/trading/model/OrderBookFiltersProvider'

export default function TradingPage() {
  const [mounted, setMounted] = useState(false)
  const [activeView, setActiveView] = useState<'orderbook' | 'chart' | 'depth' | 'trades'>(
    'orderbook'
  )
  const { theme: currentTheme, systemTheme } = useTheme()

  const isDark = currentTheme === 'dark' || (currentTheme === 'system' && systemTheme === 'dark')
  const t = getThemeClasses(isDark)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const views = [
    { id: 'orderbook' as const, icon: BookOpen, label: 'Order Book' },
    { id: 'chart' as const, icon: BarChart3, label: 'Chart' },
    { id: 'depth' as const, icon: Activity, label: 'Depth' },
    { id: 'trades' as const, icon: TrendingUp, label: 'Trades' },
  ]

  return (
    <OrderBookFiltersProvider>
      <TradingPageContent
        activeView={activeView}
        setActiveView={setActiveView}
        views={views}
        isDark={isDark}
        t={t}
      />
    </OrderBookFiltersProvider>
  )
}

function TradingPageContent({
  activeView,
  setActiveView,
  views,
  isDark,
  t,
}: {
  activeView: 'orderbook' | 'chart' | 'depth' | 'trades'
  setActiveView: (view: 'orderbook' | 'chart' | 'depth' | 'trades') => void
  views: Array<{ id: 'orderbook' | 'chart' | 'depth' | 'trades'; icon: LucideIcon; label: string }>
  isDark: boolean
  t: ReturnType<typeof getThemeClasses>
}) {
  const { refreshOrderBook } = useOrderBookFilters()

  return (
    <div className="w-full h-full relative z-10 flex flex-col">
      {/* View Tabs */}
      <div
        className={`mb-2 backdrop-blur-[40px] ${t.card} rounded-xl p-1 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 ${
          isDark ? 'bg-white/[0.03]' : 'bg-white/30'
        }`}
      >
        <div className="flex flex-wrap gap-1">
          {views.map((view) => {
            const Icon = view.icon
            const isActive = activeView === view.id
            return (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all duration-200 font-medium text-[11px] relative overflow-hidden ${
                  isActive
                    ? isDark
                      ? 'bg-white/10 text-white backdrop-blur-xl'
                      : 'bg-white/50 text-slate-800 backdrop-blur-xl'
                    : `${t.textSecondary} ${t.cardHover}`
                }`}
              >
                {isActive && (
                  <>
                    <div
                      className={`absolute inset-0 backdrop-blur-xl ${
                        isDark ? 'bg-white/10' : 'bg-white/30'
                      } rounded-lg`}
                    />
                    <div
                      className={`absolute inset-0 bg-gradient-to-b ${
                        isDark ? 'from-white/5' : 'from-white/20'
                      } to-transparent rounded-lg`}
                    />
                  </>
                )}
                <Icon
                  size={12}
                  strokeWidth={2.5}
                  className={`relative ${isActive ? 'opacity-100' : 'opacity-70'}`}
                />
                <span className="relative">{view.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Trading Layout */}
      <div className="flex-1 min-h-0">
        <TradingLayout activeTradingView={activeView} />
      </div>

      {/* Filter Panel */}
      <FilterPanel onFiltersChange={refreshOrderBook} />
    </div>
  )
}
