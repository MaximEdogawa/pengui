'use client'

import {
  formatConfirmedBalance,
  formatSpendableBalance,
} from '@/shared/lib/walletConnect/utils/balanceUtils'
import { useWalletBalance, useRefreshBalance, useBalanceLoading } from '../model'
import { useThemeClasses } from '@/shared/hooks'
import { useWalletConnectionState } from '@maximedogawa/chia-wallet-connect-react'
import { Wallet, RefreshCw } from 'lucide-react'
import { useMemo } from 'react'

export default function WalletBalanceCard() {
  const { isDark, t } = useThemeClasses()
  const { isConnected, connectedWallet, walletName } = useWalletConnectionState()
  const { data: balance, isLoading: isLoadingBalance, error: balanceError } = useWalletBalance()
  const { refreshBalance } = useRefreshBalance()

  const { showSpinner, setIsRefreshing } = useBalanceLoading({
    isConnected,
    isLoading: isLoadingBalance,
    hasBalance: !!balance,
  })

  const formattedBalance = useMemo(() => formatConfirmedBalance(balance), [balance])
  const formattedSpendable = useMemo(() => formatSpendableBalance(balance), [balance])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshBalance()
      await new Promise((resolve) => setTimeout(resolve, 500))
    } catch {
      // Error handled by query
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="flex items-center justify-between mb-3">
      <div>
        <p className={`${t.textSecondary} text-[10px] font-medium mb-2 uppercase tracking-wide`}>
          Wallet Balance
        </p>
        <h2 className={`text-2xl lg:text-3xl font-semibold ${t.text} tracking-tight`}>
          {isConnected ? (
            balanceError ? (
              <span className={`${isDark ? 'text-red-400' : 'text-red-600'} text-lg`}>
                Error loading balance
              </span>
            ) : (
              <span className={`tabular-nums ${showSpinner ? 'opacity-40' : ''}`}>
                {formattedBalance} XCH
              </span>
            )
          ) : (
            '-- XCH'
          )}
        </h2>
        <div className="mt-1">
          {isConnected ? (
            <>
              <p className={`${t.textSecondary} text-xs`}>
                {walletName || connectedWallet || 'Wallet Connected'}
              </p>
              {balance && !isLoadingBalance && (
                <p className={`${t.textSecondary} text-xs mt-1`}>
                  Spendable: {formattedSpendable} XCH
                  {balance.spendableCoinCount !== undefined && (
                    <span className="ml-2">
                      ({balance.spendableCoinCount} coin
                      {balance.spendableCoinCount !== 1 ? 's' : ''})
                    </span>
                  )}
                </p>
              )}
            </>
          ) : (
            <p className={`${t.textSecondary} text-xs`}>
              <span className={`${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                Not connected
              </span>
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isConnected && (
          <button
            onClick={handleRefresh}
            disabled={showSpinner}
            className={`p-2 rounded-lg ${t.cardHover} transition-colors ${t.textSecondary} ${t.textHover} disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Refresh balance"
          >
            <RefreshCw size={18} strokeWidth={2} className={showSpinner ? 'animate-spin' : ''} />
          </button>
        )}
        <div
          className={`p-3 rounded-xl ${isDark ? 'bg-cyan-500/10' : 'bg-cyan-600/15'} backdrop-blur-sm`}
        >
          <Wallet
            className={`${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}
            size={20}
            strokeWidth={2}
          />
        </div>
      </div>
    </div>
  )
}
