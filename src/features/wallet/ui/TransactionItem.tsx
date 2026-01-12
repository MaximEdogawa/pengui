'use client'

import { formatAddress } from '@/shared/lib/utils/addressUtils'
import { formatRelativeTime } from '@/shared/lib/utils/dateUtils'
import { formatAmountFromMojos } from '@/shared/lib/utils/amountUtils'
import { useThemeClasses } from '@/shared/hooks'
import type { StoredTransaction } from '@/shared/lib/walletConnect/utils/transactionStorage'
import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, XCircle } from 'lucide-react'

interface TransactionItemProps {
  transaction: StoredTransaction
}

export default function TransactionItem({ transaction: tx }: TransactionItemProps) {
  const { isDark, t } = useThemeClasses()

  const address = tx.recipientAddress || tx.senderAddress || ''
  const isSend = tx.type === 'send'

  return (
    <div
      className={`p-3 rounded-xl backdrop-blur-xl border transition-all ${
        isDark
          ? 'bg-white/[0.03] border-white/5 hover:bg-white/5'
          : 'bg-white/50 border-cyan-200/30 hover:bg-white/60'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className={`p-2 rounded-lg flex-shrink-0 ${
              isSend
                ? isDark
                  ? 'bg-red-500/10'
                  : 'bg-red-100'
                : isDark
                  ? 'bg-emerald-500/10'
                  : 'bg-emerald-100'
            }`}
          >
            {isSend ? (
              <ArrowUpRight className={isDark ? 'text-red-400' : 'text-red-600'} size={16} />
            ) : (
              <ArrowDownLeft
                className={isDark ? 'text-emerald-400' : 'text-emerald-600'}
                size={16}
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className={`${t.text} text-sm font-medium`}>{isSend ? 'Sent' : 'Received'}</p>
              {tx.status === 'pending' && (
                <Clock className={`${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} size={14} />
              )}
              {tx.status === 'confirmed' && (
                <CheckCircle2
                  className={`${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}
                  size={14}
                />
              )}
              {tx.status === 'failed' && (
                <XCircle className={`${isDark ? 'text-red-400' : 'text-red-600'}`} size={14} />
              )}
            </div>
            <p className={`${t.textSecondary} text-xs truncate`}>
              {address ? formatAddress(address, 8, 6) : 'Unknown address'}
            </p>
            {tx.memo && (
              <p className={`${t.textSecondary} text-xs mt-1 truncate`} title={tx.memo}>
                Memo: {tx.memo}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end flex-shrink-0 ml-3">
          <p
            className={`text-sm font-semibold ${
              isSend
                ? isDark
                  ? 'text-red-400'
                  : 'text-red-600'
                : isDark
                  ? 'text-emerald-400'
                  : 'text-emerald-600'
            }`}
          >
            {isSend ? '-' : '+'}
            {formatAmountFromMojos(tx.amount)} XCH
          </p>
          <p className={`${t.textSecondary} text-xs`}>{formatRelativeTime(tx.timestamp)}</p>
          {tx.fee && parseFloat(tx.fee) > 0 && (
            <p className={`${t.textSecondary} text-[10px] mt-0.5`}>
              Fee: {formatAmountFromMojos(tx.fee)} XCH
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
