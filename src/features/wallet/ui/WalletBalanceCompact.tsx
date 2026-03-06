'use client'

import {
  formatSpendableBalance,
} from '@/shared/lib/walletConnect/utils/balanceUtils'
import { useThemeClasses } from '@/shared/hooks'
import { useWalletConnectionState } from '@maximedogawa/chia-wallet-connect-react'
import { RefreshCw } from 'lucide-react'
import { useMemo } from 'react'
import { useRefreshBalance, useWalletBalance } from '../hooks/useWalletQueries'
import { useBalanceLoading } from '../hooks/useBalanceLoading'

export default function WalletBalanceCompact() {
  const { isDark, t } = useThemeClasses()
  const { isConnected } = useWalletConnectionState()
  const { data: balance, isLoading: isLoadingBalance, error: balanceError } = useWalletBalance()
  const { refreshBalance } = useRefreshBalance()
  const { showSpinner, setIsRefreshing } = useBalanceLoading({
    isConnected,
    isLoading: isLoadingBalance,
    hasBalance: !!balance,
  })

  const formattedSpendable = useMemo(
    () => formatSpendableBalance(balance),
    [balance],
  )

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshBalance()
      await new Promise((r) => setTimeout(r, 500))
    } catch {
      // ignore
    } finally {
      setIsRefreshing(false)
    }
  }

  if (!isConnected) return null

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border py-1.5 pl-2.5 pr-1.5 ${
        isDark ? 'border-white/5 bg-white/[0.04]' : 'border-cyan-200/30 bg-white/50'
      } ${t.border}`}
    >
      {balanceError ? (
        <span className={`text-[11px] font-medium ${isDark ? 'text-red-400' : 'text-red-600'}`}>
          Error
        </span>
      ) : (
        <span
          className={`text-xs font-semibold tabular-nums ${t.text} ${showSpinner ? 'opacity-60' : ''}`}
        >
          {formattedSpendable} XCH
        </span>
      )}
      <button
        type="button"
        onClick={handleRefresh}
        disabled={showSpinner}
        className={`rounded-md p-1 transition-colors ${t.textSecondary} hover:opacity-80 disabled:opacity-50`}
        title="Refresh balance"
        aria-label="Refresh balance"
      >
        <RefreshCw size={12} strokeWidth={2} className={showSpinner ? 'animate-spin' : ''} />
      </button>
    </div>
  )
}
