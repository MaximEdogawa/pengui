'use client'

import type { OfferDetails } from '@/entities/offer'
import { useThemeClasses } from '@/shared/hooks'
import type { OrderBookFilters, OrderBookOrder } from '../../lib/orderBookTypes'
import { useOrderBookOfferSubmission } from '../../model/useOrderBookOfferSubmission'
import { useCreateOfferFormData } from './CreateOfferForm/hooks/useCreateOfferFormData'
import { OfferPreview } from './CreateOfferForm/components/OfferPreview'
import { FeeInput } from './CreateOfferForm/components/FeeInput'
import { AssetSections } from './CreateOfferForm/components/AssetSections'
import { PriceAdjustmentSliders } from './CreateOfferForm/components/PriceAdjustmentSliders'
import { FormMessages } from './CreateOfferForm/components/FormMessages'
import { AdvancedSettings } from './CreateOfferForm/components/AdvancedSettings'
import { FormActionButtons } from './CreateOfferForm/components/FormActionButtons'

interface CreateOfferFormProps {
  order?: OrderBookOrder
  onOfferCreated?: (offer: OfferDetails) => void
  onClose?: () => void
  mode?: 'modal' | 'inline'
  initialPriceAdjustments?: { requested: number; offered: number }
  onOpenModal?: () => void
  filters?: OrderBookFilters
}

export default function CreateOfferForm({
  order,
  onOfferCreated,
  onClose,
  mode = 'inline',
  initialPriceAdjustments,
  onOpenModal,
  filters,
}: CreateOfferFormProps) {
  const { t } = useThemeClasses()

  const { makerAssets, setMakerAssets, takerAssets, setTakerAssets, useAsTemplate, resetForm } =
    useOrderBookOfferSubmission()

  const formData = useCreateOfferFormData({
    order,
    filters,
    makerAssets,
    setMakerAssets,
    takerAssets,
    setTakerAssets,
    useAsTemplate,
    resetForm,
    initialPriceAdjustments,
    onOfferCreated,
    mode,
    onClose,
  })

  const containerClass = mode === 'modal' ? 'space-y-4' : 'space-y-3'

  return (
    <div className={containerClass}>
      <form onSubmit={formData.handleSubmit} className={containerClass}>
        <OfferPreview
          previewOffered={formData.previewOffered}
          previewRequested={formData.previewRequested}
          fee={formData.fee}
          t={t}
        />

        <FeeInput
          feeDisplayValue={formData.feeDisplayValue}
          handleFeeChange={formData.handleFeeChange}
          handleFeeBlur={formData.handleFeeBlur}
          feePlaceholder={formData.feePlaceholder}
          isSubmitting={formData.isSubmitting}
          t={t}
        />

        <FormActionButtons
          mode={mode}
          order={order}
          onClose={onClose}
          onOpenModal={onOpenModal}
          isSubmitting={formData.isSubmitting}
          isUploadingToDexie={formData.isUploadingToDexie}
          isFormValid={formData.isFormValid}
          orderType={formData.orderType}
        />

        {mode === 'modal' && (
          <AssetSections
            extendedMakerAssets={formData.extendedMakerAssets}
            extendedTakerAssets={formData.extendedTakerAssets}
            updateOfferedAsset={formData.updateOfferedAsset}
            removeOfferedAsset={formData.removeOfferedAsset}
            addOfferedAsset={formData.addOfferedAsset}
            updateRequestedAsset={formData.updateRequestedAsset}
            removeRequestedAsset={formData.removeRequestedAsset}
            addRequestedAsset={formData.addRequestedAsset}
            t={t}
          />
        )}

        {order &&
          order.requesting &&
          order.requesting.length > 0 &&
          order.offering &&
          order.offering.length > 0 && (
            <PriceAdjustmentSliders
              requestedAdjustment={formData.requestedAdjustment}
              setRequestedAdjustment={formData.setRequestedAdjustment}
              offeredAdjustment={formData.offeredAdjustment}
              setOfferedAdjustment={formData.setOfferedAdjustment}
              t={t}
            />
          )}

        <FormMessages
          errorMessage={formData.errorMessage}
          successMessage={formData.successMessage}
          t={t}
        />
      </form>

      <AdvancedSettings
        isDetailedViewExpanded={formData.isDetailedViewExpanded}
        setIsDetailedViewExpanded={formData.setIsDetailedViewExpanded}
        expirationEnabled={formData.expirationEnabled}
        setExpirationEnabled={formData.setExpirationEnabled}
        expirationDays={formData.expirationDays}
        setExpirationDays={formData.setExpirationDays}
        expirationHours={formData.expirationHours}
        setExpirationHours={formData.setExpirationHours}
        expirationMinutes={formData.expirationMinutes}
        setExpirationMinutes={formData.setExpirationMinutes}
        t={t}
      />
    </div>
  )
}
