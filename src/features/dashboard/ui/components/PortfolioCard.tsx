'use client'

import { AppLink } from '@/shared/ui'
import { PieChart as PieChartIcon, ArrowRight } from 'lucide-react'
import type { ThemeClasses } from '@/shared/lib/theme'
import { useWalletAssets } from '@/features/wallet'
import { TickerIcon, XchIcon } from '@/entities/asset'
import { isChiaNativeToken } from '@/shared/lib/constants/chia-assets'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useMemo, useState, useCallback } from 'react'
import { CardSkeleton } from './CardSkeleton'

interface PortfolioCardProps {
  isDark: boolean
  t: ThemeClasses
}

const CHART_COLORS = [
  '#22d3ee', // cyan-400
  '#3b82f6', // blue-500
  '#a78bfa', // violet-400
  '#f472b6', // pink-400
  '#34d399', // emerald-400
  '#fbbf24', // amber-400
  '#fb923c', // orange-400
  '#818cf8', // indigo-400
]

interface PortfolioSlice {
  assetId: string
  name: string
  ticker: string
  value: number
  percentage: number
}

function CustomTooltip({
  active,
  payload,
  isDark,
}: {
  active?: boolean
  payload?: Array<{ payload: PortfolioSlice }>
  isDark: boolean
}) {
  if (!active || !payload?.[0]) return null
  const data = payload[0].payload

  return (
    <div
      className={`rounded-xl px-3 py-2 text-xs shadow-xl border backdrop-blur-xl ${
        isDark
          ? 'bg-slate-900/90 border-white/10 text-white'
          : 'bg-white/90 border-slate-200 text-slate-800'
      }`}
    >
      <p className="font-semibold">{data.name}</p>
      <p className="opacity-70">
        {new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
        }).format(data.value)}
      </p>
      <p className="opacity-50">{data.percentage.toFixed(1)}%</p>
    </div>
  )
}

export function PortfolioCard({ isDark, t }: PortfolioCardProps) {
  const { assets, isLoading } = useWalletAssets()
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const slices = useMemo<PortfolioSlice[]>(() => {
    const withValue = assets.filter((a) => a.balanceUsd != null && a.balanceUsd > 0)
    const total = withValue.reduce((s, a) => s + (a.balanceUsd ?? 0), 0)
    if (total === 0) return []

    return withValue
      .map((a) => ({
        assetId: a.assetId,
        name: a.name,
        ticker: a.ticker,
        value: a.balanceUsd!,
        percentage: ((a.balanceUsd! / total) * 100),
      }))
      .sort((a, b) => b.value - a.value)
  }, [assets])

  const onPieEnter = useCallback((_: unknown, index: number) => {
    setActiveIndex(index)
  }, [])

  const onPieLeave = useCallback(() => {
    setActiveIndex(null)
  }, [])

  if (isLoading) {
    return <CardSkeleton isDark={isDark} t={t} lines={5} />
  }

  const isEmpty = slices.length === 0

  return (
    <div
      className={`backdrop-blur-[40px] ${t.card} rounded-2xl p-3 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 flex flex-col ${
        isDark ? 'bg-white/[0.03]' : 'bg-white/30'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`p-2 rounded-xl backdrop-blur-sm ${
              isDark ? 'bg-blue-500/10' : 'bg-blue-600/15'
            }`}
          >
            <PieChartIcon
              className={isDark ? 'text-blue-400' : 'text-blue-700'}
              size={16}
              strokeWidth={2}
            />
          </div>
          <p
            className={`${t.textSecondary} text-[10px] font-medium uppercase tracking-wide`}
          >
            Portfolio
          </p>
        </div>
        <AppLink
          href="/wallet"
          className={`flex items-center gap-1 text-[10px] font-medium ${t.textTertiary} hover:opacity-80 transition-opacity`}
        >
          View details <ArrowRight size={10} />
        </AppLink>
      </div>

      {isEmpty ? (
        <div className="flex-1 flex items-center justify-center py-8">
          <p className={`${t.textTertiary} text-xs`}>No assets in portfolio</p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-2 flex-1 min-h-0">
          {/* Chart */}
          <div className="w-full sm:w-1/2 h-[160px] sm:h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  cx="50%"
                  cy="50%"
                  innerRadius="55%"
                  outerRadius="80%"
                  paddingAngle={2}
                  dataKey="value"
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                  stroke="none"
                >
                  {slices.map((_, i) => (
                    <Cell
                      key={i}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                      opacity={activeIndex === null || activeIndex === i ? 1 : 0.4}
                      style={{ transition: 'opacity 200ms' }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip isDark={isDark} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="w-full sm:w-1/2 space-y-1.5 overflow-y-auto max-h-[180px] pr-1">
            {slices.map((slice, i) => (
              <div
                key={slice.ticker}
                className={`flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors ${
                  activeIndex === i
                    ? isDark
                      ? 'bg-white/[0.05]'
                      : 'bg-white/50'
                    : ''
                }`}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                  {isChiaNativeToken(slice.assetId) ? (
                    <XchIcon size={16} />
                  ) : (
                    <TickerIcon assetId={slice.assetId} ticker={slice.ticker} size={16} />
                  )}
                  <span className={`text-[11px] font-medium ${t.text} truncate`}>
                    {slice.ticker}
                  </span>
                </div>
                <span className={`text-[11px] font-medium ${t.textSecondary} tabular-nums`}>
                  {slice.percentage.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
