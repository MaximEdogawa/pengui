import AssetSelector, { type ExtendedAsset as ExtendedOfferAsset } from '@/shared/ui/AssetSelector'
import Button from '@/shared/ui/Button'
import { Plus } from 'lucide-react'
import { useThemeClasses } from '@/shared/hooks'

interface AssetSectionProps {
  title: string
  description: string
  assets: ExtendedOfferAsset[]
  onAdd: () => void
  onUpdate: (index: number, asset: ExtendedOfferAsset) => void
  onRemove: (index: number) => void
  prefix: string
}

export function AssetSection({
  title,
  description,
  assets,
  onAdd,
  onUpdate,
  onRemove,
  prefix,
}: AssetSectionProps) {
  const { t } = useThemeClasses()

  return (
    <div className="space-y-3">
      <div>
        <h3 className={`text-sm font-medium ${t.text} mb-0.5`}>{title}</h3>
        <p className={`text-xs ${t.textSecondary}`}>{description}</p>
      </div>
      <div className="space-y-2">
        {assets.map((asset, index) => (
          <AssetSelector
            key={`${prefix}-${index}`}
            asset={asset}
            onUpdate={(updatedAsset) => onUpdate(index, updatedAsset)}
            onRemove={() => onRemove(index)}
          />
        ))}
        <Button type="button" onClick={onAdd} variant="secondary" icon={Plus} className="w-full">
          Add Asset
        </Button>
      </div>
    </div>
  )
}
