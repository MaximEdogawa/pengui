'use client'

import { useWalletAssets } from '../hooks/useWalletAssets'
import { useAssetFilter } from '../hooks/useAssetFilter'
import { CHIA_ASSET_IDS } from '@/shared/lib/constants/chia-assets'
import Card from './shared/Card'
import EmptyState from './shared/EmptyState'
import WalletFilterBar from './WalletFilterBar'
import AssetPane from './AssetPane'
import { Wallet } from 'lucide-react'

function assetDetailHref(assetId: string): string {
  const slug = assetId === CHIA_ASSET_IDS.XCH || assetId === '' ? 'xch' : assetId
  return `/wallet/${encodeURIComponent(slug)}`
}

export default function AssetListPane() {
  const { assets, isLoading } = useWalletAssets()
  const {
    searchQuery,
    setSearchQuery,
    filteredAssets,
  } = useAssetFilter(assets)

  return (
    <Card>
      <WalletFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <div className="mt-3 space-y-2">
        {isLoading && filteredAssets.length === 0 ? (
          <div className="py-8 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-cyan-500 dark:border-gray-600 dark:border-t-cyan-400" />
            <span>Loading assets…</span>
          </div>
        ) : filteredAssets.length === 0 ? (
          <EmptyState
            icon={Wallet}
            message={
              assets.length === 0
                ? 'No assets in your wallet. Connect your wallet to see balances.'
                : 'No assets match your filters. Try a different category or search.'
            }
          />
        ) : (
          filteredAssets.map((asset) => (
            <AssetPane
              key={asset.assetId || 'xch'}
              asset={asset}
              href={assetDetailHref(asset.assetId)}
            />
          ))
        )}
      </div>
    </Card>
  )
}
