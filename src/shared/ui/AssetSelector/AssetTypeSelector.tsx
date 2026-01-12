'use client'

import { useThemeClasses } from '@/shared/hooks'
import type { AssetType } from '@/entities/offer'

interface AssetTypeSelectorProps {
  value: AssetType
  onChange: (type: AssetType) => void
  enabledAssetTypes: AssetType[]
}

export default function AssetTypeSelector({
  value,
  onChange,
  enabledAssetTypes,
}: AssetTypeSelectorProps) {
  const { t } = useThemeClasses()

  return (
    <div className="flex-shrink-0 w-21">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as AssetType)}
        className={`w-full px-1 py-2 text-xs rounded-lg border ${t.border} ${t.bg} ${t.text} transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
      >
        {enabledAssetTypes.includes('cat') && <option value="cat">Token</option>}
        {enabledAssetTypes.includes('nft') && <option value="nft">NFT</option>}
        {enabledAssetTypes.includes('option') && <option value="option">Option</option>}
      </select>
    </div>
  )
}
