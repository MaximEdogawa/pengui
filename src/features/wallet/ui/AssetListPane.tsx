'use client'

import { useRouter } from 'next/navigation'
import { useWalletAssets } from '../hooks/useWalletAssets'
import { useAssetFilter } from '../hooks/useAssetFilter'
import { CHIA_ASSET_IDS } from '@/shared/lib/constants/chia-assets'
import Card from './shared/Card'
import EmptyState from './shared/EmptyState'
import WalletFilterBar from './WalletFilterBar'
import AssetPane from './AssetPane'
import { Wallet } from 'lucide-react'

export default function AssetListPane() {
  const router = useRouter()
  const { assets, isLoading, isError, loadingProgress } = useWalletAssets()
  const {
    category,
    setCategory,
    searchQuery,
    setSearchQuery,
    filteredAssets,
  } = useAssetFilter(assets)

  const handleAssetClick = (assetId: string) => {
    const slug = assetId === CHIA_ASSET_IDS.XCH || assetId === '' ? 'xch' : assetId
    router.push(`/wallet/${encodeURIComponent(slug)}`)
  }

  if (isError) {
    return (
      <Card>
        <p className="text-red-500 dark:text-red-400 text-sm py-4">
          Failed to load assets. Please try again.
        </p>
      </Card>
    )
  }

  return (
    <Card>
      <WalletFilterBar
        category={category}
        onCategoryChange={setCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <div className="mt-3 space-y-2">
        {isLoading && filteredAssets.length === 0 ? (
          <div className="py-8 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-cyan-500 dark:border-gray-600 dark:border-t-cyan-400" />
              <span>
                Loading assets
                {loadingProgress && loadingProgress.total > 0 ? (
                  <span className="ml-1.5 font-medium tabular-nums text-gray-600 dark:text-gray-300">
                    {loadingProgress.loaded} / {loadingProgress.total}
                  </span>
                ) : null}
                …
              </span>
            </div>
            {loadingProgress && loadingProgress.total > 1 && (
              <div className="w-full max-w-xs overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 transition-all duration-300"
                  style={{
                    width: `${Math.round((loadingProgress.loaded / loadingProgress.total) * 100)}%`,
                  }}
                />
              </div>
            )}
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
          <>
            {isLoading && loadingProgress && loadingProgress.total > 1 && (
              <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-gray-100 dark:bg-white/5 text-xs text-gray-500 dark:text-gray-400">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-cyan-500 dark:border-gray-600 dark:border-t-cyan-400" />
                <span className="tabular-nums">
                  Loading… {loadingProgress.loaded} / {loadingProgress.total}
                </span>
              </div>
            )}
            {filteredAssets.map((asset) => (
              <AssetPane
                key={asset.assetId || 'xch'}
                asset={asset}
                onClick={() => handleAssetClick(asset.assetId)}
              />
            ))}
          </>
        )}
      </div>
    </Card>
  )
}
