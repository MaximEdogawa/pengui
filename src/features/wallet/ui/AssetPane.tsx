'use client'

import { useThemeClasses } from '@/shared/hooks'
import { useNetwork } from '@/shared/hooks/useNetwork'
import TickerIcon, { XchIcon } from '@/entities/asset/ui/TickerIcon'
import { CHIA_ASSET_IDS } from '@/shared/lib/constants/chia-assets'
import type { WalletAssetItem } from '../hooks/useWalletAssets'

interface AssetPaneProps {
  asset: WalletAssetItem
  onClick: () => void
}

function formatBalance(balance: number, type: string): string {
  if (type === 'xch') return balance.toFixed(6)
  if (balance >= 1e9) return balance.toLocaleString(undefined, { maximumFractionDigits: 0 })
  if (balance >= 1) return balance.toFixed(2)
  return balance.toFixed(6)
}

function formatUsd(value: number | null): string {
  if (value == null || value <= 0) return '—'
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`
  return `$${value.toFixed(2)}`
}

function formatPrice(value: number | null): string {
  if (value == null || value <= 0) return ''
  if (value >= 1_000) return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
  if (value >= 1) return `$${value.toFixed(2)}`
  if (value >= 0.01) return `$${value.toFixed(4)}`
  return `$${value.toPrecision(3)}`
}

export default function AssetPane({ asset, onClick }: AssetPaneProps) {
  const { isDark, t } = useThemeClasses()
  const { network } = useNetwork()
  const isXch = asset.assetId === CHIA_ASSET_IDS.XCH || asset.assetId === ''
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
        isDark
          ? 'bg-white/[0.03] border-white/5 hover:bg-white/5'
          : 'bg-white/50 border-cyan-200/30 hover:bg-white/60'
      } ${t.cardHover ?? ''}`}
    >
      <div className="flex-shrink-0">
        {isXch ? (
          <XchIcon size={32} isTestnet={network === 'testnet'} />
        ) : (
          <TickerIcon assetId={asset.assetId} ticker={asset.ticker} size={32} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`${t.text} text-sm font-medium truncate`}>{asset.name}</p>
        <p className={`${t.textSecondary} text-xs tabular-nums`}>
          {asset.ticker}
          {asset.priceUsd != null && asset.priceUsd > 0 && (
            <span className="ml-1">· {formatPrice(asset.priceUsd)}</span>
          )}
        </p>
      </div>
      <div className="flex flex-col items-end flex-shrink-0">
        <p className={`${t.text} text-sm font-semibold tabular-nums`}>
          {formatBalance(asset.balance, asset.type)} {asset.ticker}
        </p>
        <p className={`${t.textSecondary} text-xs tabular-nums`}>
          {formatUsd(asset.balanceUsd)}
        </p>
      </div>
    </button>
  )
}
