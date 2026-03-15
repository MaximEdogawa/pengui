'use client'

import { AppLink } from '@/shared/ui/AppLink'
import { useThemeClasses } from '@/shared/hooks'
import { useNetwork } from '@/shared/hooks/useNetwork'
import { useResponsive } from '@/shared/hooks/useResponsive'
import TickerIcon, { XchIcon } from '@/entities/asset/ui/TickerIcon'
import { CHIA_ASSET_IDS } from '@/shared/lib/constants/chia-assets'
import type { WalletAssetItem } from '../hooks/useWalletAssets'

interface AssetPaneProps {
  asset: WalletAssetItem
  /** Detail page href so one tap opens details (works on mobile) */
  href: string
}

const DECIMALS_MOBILE = 4

function formatBalance(balance: number, type: string, maxDecimals?: number): string {
  const dec = maxDecimals ?? 6
  if (type === 'xch') return balance.toFixed(Math.min(6, dec))
  if (balance >= 1e9) return balance.toLocaleString(undefined, { maximumFractionDigits: 0 })
  if (balance >= 1) return balance.toFixed(Math.min(2, dec))
  return balance.toFixed(Math.min(6, dec))
}

function formatUsd(value: number | null): string {
  if (value == null || value <= 0) return '—'
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`
  return `$${value.toFixed(2)}`
}

function formatPrice(value: number | null, maxDecimals?: number): string {
  if (value == null || value <= 0) return ''
  const dec = maxDecimals ?? 4
  if (value >= 1_000) return `$${value.toLocaleString(undefined, { maximumFractionDigits: Math.min(2, dec) })}`
  if (value >= 1) return `$${value.toFixed(Math.min(2, dec))}`
  if (value >= 0.01) return `$${value.toFixed(Math.min(4, dec))}`
  return `$${value.toPrecision(Math.min(3, dec + 1))}`
}

export default function AssetPane({ asset, href }: AssetPaneProps) {
  const { isDark, t } = useThemeClasses()
  const { isMobile } = useResponsive()
  const { network } = useNetwork()
  const maxDecimals = isMobile ? DECIMALS_MOBILE : undefined
  const isXch = asset.assetId === CHIA_ASSET_IDS.XCH || asset.assetId === ''
  const linkClass = `w-full flex items-center gap-3 sm:gap-3 p-3.5 sm:p-3 rounded-xl border transition-all text-left block cursor-pointer touch-manipulation min-w-0 ${
    isDark
      ? 'bg-white/[0.03] border-white/5 hover:bg-white/5 active:bg-white/8'
      : 'bg-white/50 border-cyan-200/30 hover:bg-white/60 active:bg-white/70'
  } ${t.cardHover ?? ''}`

  return (
    <AppLink
      href={href}
      className={linkClass}
    >
      <div className="flex-shrink-0">
        {isXch ? (
          <XchIcon size={36} isTestnet={network === 'testnet'} />
        ) : (
          <TickerIcon assetId={asset.assetId} ticker={asset.ticker} size={36} />
        )}
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <p className={`${t.text} text-[15px] sm:text-sm font-medium truncate`}>{asset.name}</p>
        <p className={`${t.textSecondary} text-[13px] sm:text-xs tabular-nums truncate`}>
          {asset.ticker}
          {asset.priceUsd != null && asset.priceUsd > 0 && (
            <span className="ml-1">· {formatPrice(asset.priceUsd, maxDecimals)}</span>
          )}
        </p>
      </div>
      <div className="flex flex-col items-end flex-shrink-0 min-w-0 max-w-[50%] sm:max-w-none">
        <p className={`${t.text} text-[15px] sm:text-sm font-semibold tabular-nums text-right truncate w-full`} title={`${formatBalance(asset.balance, asset.type)} ${asset.ticker}`}>
          {formatBalance(asset.balance, asset.type, maxDecimals)} {asset.ticker}
        </p>
        <p className={`${t.textSecondary} text-[13px] sm:text-xs tabular-nums text-right truncate w-full`} title={formatUsd(asset.balanceUsd)}>
          {formatUsd(asset.balanceUsd)}
        </p>
      </div>
    </AppLink>
  )
}
