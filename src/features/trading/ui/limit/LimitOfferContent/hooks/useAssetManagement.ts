import { useCallback } from 'react'
import type { ExtendedAsset as ExtendedOfferAsset } from '@/shared/ui/AssetSelector'

interface AssetItem {
  assetId: string
  amount: number
  type: 'xch' | 'cat' | 'nft'
  symbol: string
  searchQuery?: string
  showDropdown?: boolean
}

export function useAssetManagement(
  makerAssets: AssetItem[],
  setMakerAssets: (assets: AssetItem[]) => void,
  takerAssets: AssetItem[],
  setTakerAssets: (assets: AssetItem[]) => void
) {
  const addOfferedAsset = useCallback(() => {
    setMakerAssets([
      ...makerAssets,
      { assetId: '', amount: 0, type: 'xch', symbol: '', searchQuery: '', showDropdown: false },
    ])
  }, [makerAssets, setMakerAssets])

  const removeOfferedAsset = useCallback(
    (index: number) => {
      setMakerAssets(makerAssets.filter((_, i) => i !== index))
    },
    [makerAssets, setMakerAssets]
  )

  const updateOfferedAsset = useCallback(
    (index: number, asset: ExtendedOfferAsset) => {
      const updated = makerAssets.map((a, i) =>
        i === index
          ? {
              ...a,
              assetId: asset.assetId || '',
              amount: asset.amount || 0,
              type: (asset.type === 'option' ? 'cat' : asset.type) as 'xch' | 'cat' | 'nft',
              symbol: asset.symbol || '',
              searchQuery: asset.searchQuery || '',
              showDropdown: asset.showDropdown || false,
            }
          : a
      )
      setMakerAssets(updated)
    },
    [makerAssets, setMakerAssets]
  )

  const addRequestedAsset = useCallback(() => {
    setTakerAssets([
      ...takerAssets,
      { assetId: '', amount: 0, type: 'xch', symbol: '', searchQuery: '', showDropdown: false },
    ])
  }, [takerAssets, setTakerAssets])

  const removeRequestedAsset = useCallback(
    (index: number) => {
      setTakerAssets(takerAssets.filter((_, i) => i !== index))
    },
    [takerAssets, setTakerAssets]
  )

  const updateRequestedAsset = useCallback(
    (index: number, asset: ExtendedOfferAsset) => {
      const updated = takerAssets.map((a, i) =>
        i === index
          ? {
              ...a,
              assetId: asset.assetId || '',
              amount: asset.amount || 0,
              type: (asset.type === 'option' ? 'cat' : asset.type) as 'xch' | 'cat' | 'nft',
              symbol: asset.symbol || '',
              searchQuery: asset.searchQuery || '',
              showDropdown: asset.showDropdown || false,
            }
          : a
      )
      setTakerAssets(updated)
    },
    [takerAssets, setTakerAssets]
  )

  return {
    addOfferedAsset,
    removeOfferedAsset,
    updateOfferedAsset,
    addRequestedAsset,
    removeRequestedAsset,
    updateRequestedAsset,
  }
}
