'use client'

import { formatAddress } from '@/shared/lib/utils/addressUtils'
import { useThemeClasses } from '@/shared/hooks'
import { ConnectButton, useWalletConnectionState } from '@maximedogawa/chia-wallet-connect-react'
import { Wallet, Copy } from 'lucide-react'
import { useState } from 'react'

export default function WalletAddress() {
  const [isAddressCopied, setIsAddressCopied] = useState(false)
  const { isDark, t } = useThemeClasses()
  const { isConnected, address } = useWalletConnectionState()

  const copyAddress = async () => {
    if (!address) return
    try {
      await navigator.clipboard.writeText(address)
      setIsAddressCopied(true)
      setTimeout(() => setIsAddressCopied(false), 2000)
    } catch {
      // Failed to copy
    }
  }

  if (!isConnected || !address) {
    return (
      <div
        className={`backdrop-blur-xl ${
          isDark ? 'bg-white/[0.03] border-white/5' : 'bg-white/50 border-cyan-200/30'
        } rounded-xl p-3 border transition-all duration-200 flex flex-col items-center justify-center py-6`}
      >
        <p className={`${t.textSecondary} text-sm mb-4 text-center`}>
          Connect your wallet to view your address
        </p>
        <ConnectButton />
      </div>
    )
  }

  return (
    <div
      className={`backdrop-blur-xl ${
        isDark ? 'bg-white/[0.03] border-white/5' : 'bg-white/50 border-cyan-200/30'
      } rounded-xl p-3 border transition-all duration-200`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className={`p-2 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white/30'} backdrop-blur-sm`}
          >
            <Wallet className={`${t.textSecondary}`} size={16} strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`${t.textSecondary} text-xs font-medium mb-1`}>Wallet Address</p>
            <p className={`${t.text} text-sm font-mono truncate`} title={address}>
              {formatAddress(address)}
            </p>
          </div>
        </div>
        <button
          onClick={copyAddress}
          className={`p-2 rounded-lg ${t.cardHover} transition-colors ${t.textSecondary} ${t.textHover} flex-shrink-0`}
          title="Copy address"
        >
          <Copy size={18} strokeWidth={2} />
        </button>
      </div>
      {isAddressCopied && (
        <p className={`${isDark ? 'text-emerald-400' : 'text-emerald-600'} text-xs mt-2`}>
          Address copied!
        </p>
      )}
    </div>
  )
}
