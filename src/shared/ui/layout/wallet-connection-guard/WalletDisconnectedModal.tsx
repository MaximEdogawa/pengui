'use client'

import { useThemeClasses } from '@/shared/hooks'
import { AlertTriangle, WifiOff } from 'lucide-react'

interface WalletDisconnectedModalProps {
  onConfirm: () => void
}

/**
 * Modal shown when the wallet connection is detected as broken/stale.
 *
 * This typically happens when:
 * - The PC was suspended and the Sage wallet froze
 * - The wallet application was closed while Pengui was open
 * - The WalletConnect relay connection dropped
 *
 * The user is informed and pressing "OK" disconnects and redirects to login.
 */
export default function WalletDisconnectedModal({ onConfirm }: WalletDisconnectedModalProps) {
  const { isDark } = useThemeClasses()

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-[100] bg-black/60 backdrop-blur-sm"
    >
      <div
        className={`rounded-2xl shadow-2xl max-w-md w-full border transition-all duration-300 overflow-hidden ${
          isDark
            ? 'bg-gray-900/95 border-amber-500/30'
            : 'bg-white/95 border-amber-400/40'
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 pt-6 pb-4 flex flex-col items-center gap-3 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}
        >
          {/* Icon */}
          <div
            className={`flex items-center justify-center w-14 h-14 rounded-full ${
              isDark
                ? 'bg-amber-500/15 ring-1 ring-amber-500/30'
                : 'bg-amber-100 ring-1 ring-amber-300/50'
            }`}
          >
            <WifiOff
              className={`w-7 h-7 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}
            />
          </div>

          <h2 className="text-lg font-semibold text-center">
            Wallet Connection Lost
          </h2>
        </div>

        {/* Body */}
        <div className="px-6 pb-4">
          <p
            className={`text-sm leading-relaxed text-center ${
              isDark ? 'text-gray-300' : 'text-gray-600'
            }`}
          >
            The connection to your wallet is no longer valid. This can happen
            when your computer was suspended or the wallet application was
            closed.
          </p>

          {/* Info box */}
          <div
            className={`mt-4 flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-xs leading-relaxed ${
              isDark
                ? 'bg-amber-500/10 text-amber-200/90 border border-amber-500/20'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Please reconnect your wallet to continue using Pengui.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2">
          <button
            onClick={onConfirm}
            className={`w-full py-2.5 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer ${
              isDark
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25'
            }`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
