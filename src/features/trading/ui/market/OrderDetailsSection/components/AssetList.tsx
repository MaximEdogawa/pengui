import { formatAmountForTooltip } from '../../../../lib/formatAmount'

interface AssetListProps {
  label: string
  assets: Array<{ id: string; code?: string; amount?: number }>
  getTickerSymbol: (assetId: string, code?: string) => string
}

export function AssetList({ label, assets, getTickerSymbol }: AssetListProps) {
  return (
    <div>
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}:</span>
      <div className="mt-1 space-y-1">
        {assets.map((asset, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs">
            <span className="text-gray-900 dark:text-white">
              {asset.code || getTickerSymbol(asset.id)}
            </span>
            <span className="font-mono text-gray-700 dark:text-gray-300">
              {formatAmountForTooltip(asset.amount || 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
