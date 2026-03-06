'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useWalletBalance } from '../hooks/useWalletQueries'
import { useTransactionHistory } from '../hooks/useTransactionHistory'
import {
  getTransactionsByAsset,
  type StoredTransaction,
} from '@/shared/lib/walletConnect/utils/transactionStorage'
import { CHIA_ASSET_IDS } from '@/shared/lib/constants/chia-assets'
import TickerIcon, { XchIcon } from '@/entities/asset/ui/TickerIcon'
import { useCatTokens } from '@/entities/asset'
import { useNetwork } from '@/shared/hooks/useNetwork'
import { useThemeClasses } from '@/shared/hooks'
import { useXchUsdPrice } from '@/shared/hooks/useXchUsdPrice'
import { formatRelativeTime } from '@/shared/lib/utils/dateUtils'
import { formatAmountFromMojos } from '@/shared/lib/utils/amountUtils'
import { convertFromSmallestUnit } from '@/shared/lib/utils/chia-units'
import Card from './shared/Card'
import SectionHeader from './shared/SectionHeader'
import EmptyState from './shared/EmptyState'
import { Modal } from '@/shared/ui'
import SendTransactionForm from './SendTransactionForm'
import {
  ArrowLeft,
  Send,
  Download,
  TrendingUp,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react'

const PAGE_SIZE = 20

function formatBalance(balance: number, ticker: string): string {
  if (ticker === 'XCH' || ticker === 'TXCH') return balance.toFixed(6)
  if (balance >= 1e9) return balance.toLocaleString(undefined, { maximumFractionDigits: 0 })
  if (balance >= 1) return balance.toFixed(2)
  return balance.toFixed(6)
}

function formatUsd(value: number | null): string {
  if (value == null || value <= 0) return '—'
  return `$${value.toFixed(2)}`
}

interface AssetDetailViewProps {
  assetIdSlug: string
}

export default function AssetDetailView({ assetIdSlug }: AssetDetailViewProps) {
  const router = useRouter()
  const { isDark, t } = useThemeClasses()
  const { network } = useNetwork()
  const { priceUsd: xchUsdPrice } = useXchUsdPrice()
  const { getAsset } = useCatTokens()
  const [showSendModal, setShowSendModal] = useState(false)

  const assetId = assetIdSlug === 'xch' ? CHIA_ASSET_IDS.XCH : decodeURIComponent(assetIdSlug)
  const isXch = assetId === CHIA_ASSET_IDS.XCH || assetId === ''

  // Single WalletConnect RPC for this specific asset's balance.
  const { data: balanceData, isLoading: isLoadingBalance } = useWalletBalance(
    isXch ? null : 'cat',
    isXch ? null : assetId
  )

  const catalogAsset = !isXch ? getAsset(assetId) : undefined
  const displayName = isXch ? 'Chia' : (catalogAsset?.name ?? assetIdSlug.slice(0, 8))
  const ticker = isXch
    ? (network === 'testnet' ? 'TXCH' : 'XCH')
    : (catalogAsset?.ticker ?? assetIdSlug.slice(0, 8))

  const spendable = balanceData?.spendable != null ? Number(balanceData.spendable) : 0
  const balance = convertFromSmallestUnit(spendable, isXch ? 'xch' : 'cat')
  const balanceUsd = isXch && xchUsdPrice != null && balance > 0 ? balance * xchUsdPrice : null
  const availableBalance = isXch ? balance : 0

  return (
    <div className="w-full relative z-10">
      <button
        type="button"
        onClick={() => router.push('/wallet')}
        className={`flex items-center gap-2 mb-4 ${t.textSecondary} hover:underline`}
      >
        <ArrowLeft size={18} />
        Back to Wallet
      </button>

      <Card className="mb-4">
        <div className="flex items-center gap-3 mb-4">
          {isXch ? (
            <XchIcon size={40} isTestnet={network === 'testnet'} />
          ) : (
            <TickerIcon assetId={assetId} ticker={ticker} size={40} />
          )}
          <div>
            <h1 className={`text-xl font-semibold ${t.text}`}>{displayName}</h1>
            <p className={t.textSecondary}>{ticker}</p>
          </div>
        </div>
        <div className="mb-4">
          {isLoadingBalance ? (
            <div className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-cyan-500 dark:border-gray-600 dark:border-t-cyan-400" />
              <span className={`${t.textSecondary} text-sm`}>Loading balance…</span>
            </div>
          ) : (
            <>
              <p className={`text-2xl font-semibold ${t.text} tabular-nums`}>
                {formatBalance(balance, ticker)} {ticker}
              </p>
              <p className={`${t.textSecondary} tabular-nums`}>{formatUsd(balanceUsd)}</p>
            </>
          )}
        </div>

        <div
          className={`h-16 rounded-lg flex items-center justify-center mb-4 ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}
        >
          <TrendingUp className={t.textSecondary} size={24} />
          <span className={`ml-2 text-xs ${t.textSecondary}`}>Price chart</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {isXch && (
            <button
              type="button"
              onClick={() => setShowSendModal(true)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-700'
              }`}
            >
              <Send size={16} />
              Send
            </button>
          )}
          <Link
            href="/wallet"
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
              isDark ? 'bg-white/10 text-gray-300' : 'bg-gray-200 text-gray-700'
            }`}
          >
            <Download size={16} />
            Receive
          </Link>
          <Link
            href="/trading"
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
              isDark ? 'bg-white/10 text-gray-300' : 'bg-gray-200 text-gray-700'
            }`}
          >
            <TrendingUp size={16} />
            Trade
          </Link>
        </div>
      </Card>

      {showSendModal && isXch && (
        <Modal onClose={() => setShowSendModal(false)} maxWidth="max-w-md">
          <div className="p-4">
            <h2 className={`text-lg font-semibold ${t.text} mb-3`}>Send XCH</h2>
            <SendTransactionForm availableBalance={availableBalance} />
          </div>
        </Modal>
      )}

      <Card>
        <SectionHeader icon={History} title="Transaction History" />
        <AssetDetailTransactions assetId={assetId} assetSlug={assetIdSlug} />
      </Card>
    </div>
  )
}

function AssetDetailTransactions({
  assetId,
  assetSlug,
}: {
  assetId: string
  assetSlug: string
}) {
  const { t } = useThemeClasses()
  const transactions = useTransactionHistory()
  const normalizedSlug = assetSlug === 'xch' ? 'xch' : assetId
  const filtered = getTransactionsByAsset(transactions, normalizedSlug)
  const [page, setPage] = useState(1)
  const paginated = filtered.slice(0, page * PAGE_SIZE)
  const hasMore = filtered.length > paginated.length

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={History}
        message="No transactions for this asset yet."
      />
    )
  }

  return (
    <>
      <div className="space-y-2 mt-2">
        {paginated.map((tx) => (
          <TransactionRow key={tx.id} transaction={tx} />
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          className={`mt-3 w-full py-2 text-sm ${t.textSecondary} hover:underline`}
        >
          Load more
        </button>
      )}
    </>
  )
}

function TransactionRow({ transaction: tx }: { transaction: StoredTransaction }) {
  const { isDark, t } = useThemeClasses()
  const isSend = tx.type === 'send'
  const assetLabel = tx.amountAsset ?? 'XCH'

  const amountDisplay =
    assetLabel === 'XCH' || assetLabel === 'TXCH'
      ? formatAmountFromMojos(tx.amount)
      : tx.amount

  return (
    <div
      className={`p-3 rounded-xl border transition-all ${
        isDark ? 'bg-white/[0.03] border-white/5' : 'bg-white/50 border-cyan-200/30'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className={`p-2 rounded-lg flex-shrink-0 ${
              isSend ? 'bg-red-500/10' : 'bg-emerald-500/10'
            }`}
          >
            {isSend ? (
              <ArrowUpRight className="text-red-400" size={16} />
            ) : (
              <ArrowDownLeft className="text-emerald-400" size={16} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`${t.text} text-sm font-medium`}>
              {isSend ? 'Sent' : 'Received'} {assetLabel}
            </p>
            <p className={`${t.textSecondary} text-xs`}>
              {formatRelativeTime(tx.timestamp)}
              {tx.usdValueAtTime != null && (
                <span className="ml-1"> · ${tx.usdValueAtTime.toFixed(2)}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {tx.status === 'pending' && <Clock className="text-yellow-500" size={14} />}
          {tx.status === 'confirmed' && <CheckCircle2 className="text-emerald-500" size={14} />}
          {tx.status === 'failed' && <XCircle className="text-red-500" size={14} />}
          <p
            className={`text-sm font-semibold ${
              isSend ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {isSend ? '-' : '+'}
            {amountDisplay} {assetLabel}
          </p>
        </div>
      </div>
    </div>
  )
}
