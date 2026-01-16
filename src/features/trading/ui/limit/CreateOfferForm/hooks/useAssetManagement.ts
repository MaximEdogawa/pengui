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

interface UseAssetManagementProps {
  setMakerAssets: React.Dispatch<React.SetStateAction<AssetItem[]>>
  setTakerAssets: React.Dispatch<React.SetStateAction<AssetItem[]>>
  setManuallyEdited: React.Dispatch<
    React.SetStateAction<{
      requested: Set<number>
      offered: Set<number>
    }>
  >
  setBaseAmounts: React.Dispatch<React.SetStateAction<{ requested: number[]; offered: number[] }>>
}

/**
 * Extract asset management operations to reduce complexity
 */
export function useAssetManagement({
  setMakerAssets,
  setTakerAssets,
  setManuallyEdited,
  setBaseAmounts,
}: UseAssetManagementProps) {
  const addOfferedAsset = useCallback(() => {
    setMakerAssets((prev) => [
      ...prev,
      {
        assetId: '',
        amount: 0,
        type: 'xch',
        symbol: '',
        searchQuery: '',
        showDropdown: false,
        _amountInput: undefined,
      },
    ])
  }, [setMakerAssets])

  const removeOfferedAsset = useCallback(
    (index: number) => {
      setMakerAssets((prev) => prev.filter((_, i) => i !== index))
      setManuallyEdited((prev) => {
        const newSet = new Set(prev.offered)
        newSet.delete(index)
        const shifted = new Set<number>()
        newSet.forEach((idx) => {
          if (idx > index) {
            shifted.add(idx - 1)
          } else {
            shifted.add(idx)
          }
        })
        return { ...prev, offered: shifted }
      })
    },
    [setMakerAssets, setManuallyEdited]
  )

  const updateOfferedAsset = useCallback(
    (index: number, asset: ExtendedOfferAsset) => {
      setMakerAssets((prev) =>
        prev.map((a, i) =>
          i === index
            ? {
                ...a,
                assetId: asset.assetId || '',
                amount: asset.amount || 0,
                type: (asset.type === 'option' ? 'cat' : asset.type) as 'xch' | 'cat' | 'nft',
                symbol: asset.symbol || '',
                searchQuery: asset.searchQuery || '',
                showDropdown: asset.showDropdown || false,
                _amountInput: asset._amountInput,
              }
            : a
        )
      )
      setManuallyEdited((prev) => ({
        ...prev,
        offered: new Set(prev.offered).add(index),
      }))
      setBaseAmounts((prev) => ({
        ...prev,
        offered: prev.offered.map((base, idx) => (idx === index ? asset.amount || 0 : base)),
      }))
    },
    [setMakerAssets, setManuallyEdited, setBaseAmounts]
  )

  const addRequestedAsset = useCallback(() => {
    setTakerAssets((prev) => [
      ...prev,
      {
        assetId: '',
        amount: 0,
        type: 'xch',
        symbol: '',
        searchQuery: '',
        showDropdown: false,
        _amountInput: undefined,
      },
    ])
  }, [setTakerAssets])

  const removeRequestedAsset = useCallback(
    (index: number) => {
      setTakerAssets((prev) => prev.filter((_, i) => i !== index))
      setManuallyEdited((prev) => {
        const newSet = new Set(prev.requested)
        newSet.delete(index)
        const shifted = new Set<number>()
        newSet.forEach((idx) => {
          if (idx > index) {
            shifted.add(idx - 1)
          } else {
            shifted.add(idx)
          }
        })
        return { ...prev, requested: shifted }
      })
    },
    [setTakerAssets, setManuallyEdited]
  )

  const updateRequestedAsset = useCallback(
    (index: number, asset: ExtendedOfferAsset) => {
      setTakerAssets((prev) =>
        prev.map((a, i) =>
          i === index
            ? {
                ...a,
                assetId: asset.assetId || '',
                amount: asset.amount || 0,
                type: (asset.type === 'option' ? 'cat' : asset.type) as 'xch' | 'cat' | 'nft',
                symbol: asset.symbol || '',
                searchQuery: asset.searchQuery || '',
                showDropdown: asset.showDropdown || false,
                _amountInput: asset._amountInput,
              }
            : a
        )
      )
      setManuallyEdited((prev) => ({
        ...prev,
        requested: new Set(prev.requested).add(index),
      }))
      setBaseAmounts((prev) => ({
        ...prev,
        requested: prev.requested.map((base, idx) => (idx === index ? asset.amount || 0 : base)),
      }))
    },
    [setTakerAssets, setManuallyEdited, setBaseAmounts]
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
