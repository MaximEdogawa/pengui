'use client'

import { ArrowUpRight, ArrowDownRight, Wallet, PieChart, DollarSign } from 'lucide-react'
import type { ThemeClasses } from '@/shared/lib/theme'
import { StatCard } from './StatCard'

interface StatsGridProps {
  isDark: boolean
  t: ThemeClasses
}

export function StatsGrid({ isDark, t }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
      <StatCard
        icon={Wallet}
        iconBgColor={isDark ? 'bg-cyan-500/10' : 'bg-cyan-600/15'}
        iconColor={isDark ? 'text-cyan-400' : 'text-cyan-700'}
        arrowIcon={ArrowUpRight}
        arrowColor={isDark ? 'text-emerald-400' : 'text-emerald-600'}
        label="Investments"
        value="$32,450"
        change="+8.2% this month"
        changeColor={isDark ? 'text-emerald-400' : 'text-emerald-600'}
        isDark={isDark}
        t={t}
      />
      <StatCard
        icon={PieChart}
        iconBgColor={isDark ? 'bg-blue-500/10' : 'bg-blue-600/15'}
        iconColor={isDark ? 'text-blue-400' : 'text-blue-700'}
        arrowIcon={ArrowUpRight}
        arrowColor={isDark ? 'text-emerald-400' : 'text-emerald-600'}
        label="Portfolio"
        value="$12,340"
        change="+15.7% this month"
        changeColor={isDark ? 'text-emerald-400' : 'text-emerald-600'}
        isDark={isDark}
        t={t}
      />
      <StatCard
        icon={DollarSign}
        iconBgColor={isDark ? 'bg-sky-500/10' : 'bg-sky-500/20'}
        iconColor={isDark ? 'text-sky-400' : 'text-sky-600'}
        arrowIcon={ArrowDownRight}
        arrowColor={isDark ? 'text-rose-400' : 'text-rose-600'}
        label="Expenses"
        value="$3,102"
        change="-3.1% this month"
        changeColor={isDark ? 'text-rose-400' : 'text-rose-600'}
        isDark={isDark}
        t={t}
      />
    </div>
  )
}
