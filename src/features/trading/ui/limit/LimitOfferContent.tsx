'use client'

import type { OfferDetails } from '@/entities/offer'
import { assetInputAmounts, getMinimumFeeInXch } from '@/shared/lib/utils/chia-units'
import { useCallback, useMemo, useState } from 'react'
import type { OrderBookOrder } from '../../lib/orderBookTypes'
import { useOrderBookOfferSubmission } from '../../model/useOrderBookOfferSubmission'
import { usePriceAdjustment } from './LimitOfferContent/hooks/usePriceAdjustment'
import { useAssetManagement } from './LimitOfferContent/hooks/useAssetManagement'
import { useLimitOfferSubmission } from './LimitOfferContent/hooks/useLimitOfferSubmission'
import { AssetSection } from './LimitOfferContent/components/AssetSection'
import { PriceAdjustmentSection } from './LimitOfferContent/components/PriceAdjustmentSection'
import { FeeInput } from './LimitOfferContent/components/FeeInput'
import { FormActions } from './LimitOfferContent/components/FormActions'
import { FormMessages } from './LimitOfferContent/components/FormMessages'
import { OrderDetailsCollapsible } from './LimitOfferContent/components/OrderDetailsCollapsible'
import type { ExtendedAsset as ExtendedOfferAsset } from '@/shared/ui/AssetSelector'

interface MakerOfferContentProps {
  order?: OrderBookOrder
  onOfferCreated?: (offer: OfferDetails) => void
  onClose?: () => void
  mode?: 'modal' | 'inline'
}

export default function MakerOfferContent({
  order,
  onOfferCreated,
  onClose,
  mode = 'inline',
}: MakerOfferContentProps) {
  const { makerAssets, setMakerAssets, takerAssets, setTakerAssets, useAsTemplate, resetForm } =
    useOrderBookOfferSubmission()

  const [fee, setFee] = useState(getMinimumFeeInXch())
  const [feeInput, setFeeInput] = useState<string | undefined>(undefined)

  const {
    requestedAdjustment,
    setRequestedAdjustment,
    offeredAdjustment,
    setOfferedAdjustment,
    originalRequestedAmounts,
    originalOfferedAmounts,
  } = usePriceAdjustment({
    order,
    useAsTemplate,
    makerAssets,
    takerAssets,
    setMakerAssets,
    setTakerAssets,
  })

  const {
    addOfferedAsset,
    removeOfferedAsset,
    updateOfferedAsset,
    addRequestedAsset,
    removeRequestedAsset,
    updateRequestedAsset,
  } = useAssetManagement(makerAssets, setMakerAssets, takerAssets, setTakerAssets)

  const extendedMakerAssets: ExtendedOfferAsset[] = useMemo(
    () =>
      makerAssets.map((asset) => ({
        assetId: asset.assetId,
        amount: asset.amount,
        type: asset.type,
        symbol: asset.symbol,
        searchQuery: asset.searchQuery || '',
        showDropdown: asset.showDropdown || false,
      })),
    [makerAssets]
  )

  const extendedTakerAssets: ExtendedOfferAsset[] = useMemo(
    () => takerAssets.map((asset) => ({
      assetId: asset.assetId,
      amount: asset.amount,
      type: asset.type,
      symbol: asset.symbol,
      searchQuery: asset.searchQuery || '',
      showDropdown: asset.showDropdown || false,
    })),
    [takerAssets]
  )

  const isFormValid = useMemo(() => {
    return (
      extendedMakerAssets.length > 0 &&
      extendedTakerAssets.length > 0 &&
      extendedMakerAssets.every(
        (asset) => asset.amount > 0 && (asset.type === 'xch' || asset.assetId)
      ) &&
      extendedTakerAssets.every(
        (asset) => asset.amount > 0 && (asset.type === 'xch' || asset.assetId)
      ) &&
      fee >= 0
    )
  }, [extendedMakerAssets, extendedTakerAssets, fee])

  const handleFeeChange = useCallback((value: string) => {
    if (assetInputAmounts.isValid(value, 'xch')) {
      setFeeInput(value)
      const parsed = assetInputAmounts.parse(value, 'xch')
      setFee(parsed)
    }
  }, [])

  const { handleSubmit, isSubmitting, isUploadingToDexie, errorMessage, successMessage } =
    useLimitOfferSubmission({
      extendedMakerAssets,
      extendedTakerAssets,
      fee,
      isFormValid,
      onOfferCreated,
      resetForm,
      mode,
      onClose,
      setRequestedAdjustment,
      setOfferedAdjustment,
      setFee,
      setFeeInput,
    })

  const containerClass = mode === 'modal' ? 'space-y-4' : 'space-y-3'

  return (
    <div className={containerClass}>
      <form onSubmit={handleSubmit} className={containerClass}>
        {order && (
          <PriceAdjustmentSection
            requestedAdjustment={requestedAdjustment}
            setRequestedAdjustment={setRequestedAdjustment}
            offeredAdjustment={offeredAdjustment}
            setOfferedAdjustment={setOfferedAdjustment}
            originalRequestedAmounts={originalRequestedAmounts}
            originalOfferedAmounts={originalOfferedAmounts}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AssetSection
            title="Offered"
            description="Assets you are offering."
            assets={extendedMakerAssets}
            onAdd={addOfferedAsset}
            onUpdate={updateOfferedAsset}
            onRemove={removeOfferedAsset}
            prefix="offered"
          />
          <AssetSection
            title="Requested"
            description="Assets you are requesting."
            assets={extendedTakerAssets}
            onAdd={addRequestedAsset}
            onUpdate={updateRequestedAsset}
            onRemove={removeRequestedAsset}
            prefix="requested"
          />
        </div>

        <FeeInput
          fee={fee}
          feeInput={feeInput}
          onFeeChange={handleFeeChange}
          onFeeBlur={() => {
            const parsed = assetInputAmounts.parse(
              feeInput !== undefined ? feeInput : fee?.toString() || '',
              'xch'
            )
            setFee(parsed >= 0 ? parsed : getMinimumFeeInXch())
            setFeeInput(undefined)
          }}
          isSubmitting={isSubmitting}
        />

        <FormActions
          mode={mode}
          onClose={onClose}
          isSubmitting={isSubmitting}
          isUploadingToDexie={isUploadingToDexie}
          isFormValid={isFormValid}
        />

        <FormMessages errorMessage={errorMessage} successMessage={successMessage} />
      </form>

      {order && <OrderDetailsCollapsible order={order} mode={mode} />}
    </div>
  )
}
