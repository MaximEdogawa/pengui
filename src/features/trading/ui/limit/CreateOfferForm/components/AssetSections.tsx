import { Plus } from 'lucide-react'
import AssetSelector, { type ExtendedAsset as ExtendedOfferAsset } from '@/shared/ui/AssetSelector'
import Button from '@/shared/ui/Button'
import type { ThemeClasses } from '@/shared/lib/theme'

interface AssetSectionsProps {
  extendedMakerAssets: ExtendedOfferAsset[]
  extendedTakerAssets: ExtendedOfferAsset[]
  updateOfferedAsset: (index: number, asset: ExtendedOfferAsset) => void
  removeOfferedAsset: (index: number) => void
  addOfferedAsset: () => void
  updateRequestedAsset: (index: number, asset: ExtendedOfferAsset) => void
  removeRequestedAsset: (index: number) => void
  addRequestedAsset: () => void
  t: ThemeClasses
}

/**
 * Extract asset sections to reduce CreateOfferForm size
 */
export function AssetSections({
  extendedMakerAssets,
  extendedTakerAssets,
  updateOfferedAsset,
  removeOfferedAsset,
  addOfferedAsset,
  updateRequestedAsset,
  removeRequestedAsset,
  addRequestedAsset,
  t,
}: AssetSectionsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Offered Section */}
      <div
        className="p-4 rounded-lg backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-white/10 dark:border-white/5"
        style={{
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div className="mb-3">
          <h3 className={`text-sm font-semibold ${t.text} mb-0.5`}>Offered</h3>
          <p className={`text-xs ${t.textSecondary}`}>Assets you are offering.</p>
        </div>
        <div className="space-y-2">
          {extendedMakerAssets.map((asset, index) => (
            <AssetSelector
              key={`offered-${index}`}
              asset={asset}
              onUpdate={(updatedAsset) => updateOfferedAsset(index, updatedAsset)}
              onRemove={() => removeOfferedAsset(index)}
            />
          ))}
          <Button
            type="button"
            onClick={addOfferedAsset}
            variant="secondary"
            icon={Plus}
            className="w-full"
          >
            Add Asset
          </Button>
        </div>
      </div>

      {/* Requested Section */}
      <div
        className="p-4 rounded-lg backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-white/10 dark:border-white/5"
        style={{
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div className="mb-3">
          <h3 className={`text-sm font-semibold ${t.text} mb-0.5`}>Requested</h3>
          <p className={`text-xs ${t.textSecondary}`}>Assets you are requesting.</p>
        </div>
        <div className="space-y-2">
          {extendedTakerAssets.map((asset, index) => (
            <AssetSelector
              key={`requested-${index}`}
              asset={asset}
              onUpdate={(updatedAsset) => updateRequestedAsset(index, updatedAsset)}
              onRemove={() => removeRequestedAsset(index)}
            />
          ))}
          <Button
            type="button"
            onClick={addRequestedAsset}
            variant="secondary"
            icon={Plus}
            className="w-full"
          >
            Add Asset
          </Button>
        </div>
      </div>
    </div>
  )
}
