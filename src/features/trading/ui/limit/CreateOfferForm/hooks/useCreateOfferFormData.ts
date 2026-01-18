import type { OrderBookFilters, OrderBookOrder } from '../../../../lib/orderBookTypes'
import type { AssetItem } from '../../../../model/useOrderBookOfferSubmission'
import { useOrderType } from './useOrderType'
import { useAssetAdjustments } from './useAssetAdjustments'
import { useAssetConversion } from './useAssetConversion'
import { useFormValidation } from './useFormValidation'
import { useAssetManagement } from './useAssetManagement'
import { useFormSubmission } from './useFormSubmission'
import { usePreviewCalculations } from './usePreviewCalculations'
import { useOrderInitialization } from './useOrderInitialization'
import { useFeeInput } from './useFeeInput'
import { useCreateOfferFormState } from './useCreateOfferFormState'
import type { OfferDetails } from '@/entities/offer'

interface UseCreateOfferFormDataProps {
  order: OrderBookOrder | undefined
  filters: OrderBookFilters | undefined
  makerAssets: AssetItem[]
  setMakerAssets: React.Dispatch<React.SetStateAction<AssetItem[]>>
  takerAssets: AssetItem[]
  setTakerAssets: React.Dispatch<React.SetStateAction<AssetItem[]>>
  useAsTemplate: (order: OrderBookOrder) => void
  resetForm: () => void
  initialPriceAdjustments?: { requested: number; offered: number }
  onOfferCreated?: (offer: OfferDetails) => void
  mode: 'modal' | 'inline'
  onClose?: () => void
}

/**
 * Extract all form data hooks to reduce CreateOfferForm size
 */
export function useCreateOfferFormData({
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
}: UseCreateOfferFormDataProps) {
  const orderType = useOrderType(order, filters)

  const formState = useCreateOfferFormState({ initialPriceAdjustments })

  const {
    fee,
    feeDisplayValue,
    handleFeeChange,
    handleFeeBlur,
    feePlaceholder,
  } = useFeeInput()

  useOrderInitialization({
    order,
    useAsTemplate,
    initialPriceAdjustments,
    setRequestedAdjustment: formState.setRequestedAdjustment,
    setOfferedAdjustment: formState.setOfferedAdjustment,
  })

  const { adjustedTakerAssets, adjustedMakerAssets } = useAssetAdjustments({
    order,
    makerAssets,
    takerAssets,
    requestedAdjustment: formState.requestedAdjustment,
    offeredAdjustment: formState.offeredAdjustment,
    manuallyEdited: formState.manuallyEdited,
    baseAmounts: formState.baseAmounts,
    setBaseAmounts: formState.setBaseAmounts,
    setManuallyEdited: formState.setManuallyEdited,
  })

  const { extendedMakerAssets, extendedTakerAssets } = useAssetConversion(
    adjustedMakerAssets,
    adjustedTakerAssets
  )

  const isFormValid = useFormValidation(extendedMakerAssets, extendedTakerAssets, fee)

  const {
    addOfferedAsset,
    removeOfferedAsset,
    updateOfferedAsset,
    addRequestedAsset,
    removeRequestedAsset,
    updateRequestedAsset,
  } = useAssetManagement({
    setMakerAssets,
    setTakerAssets,
    setManuallyEdited: formState.setManuallyEdited,
    setBaseAmounts: formState.setBaseAmounts,
  })

  const { handleSubmit, isSubmitting, isUploadingToDexie, errorMessage, successMessage } =
    useFormSubmission({
      extendedMakerAssets,
      extendedTakerAssets,
      fee,
      isFormValid,
      onOfferCreated,
      resetForm,
      mode,
      onClose,
    })

  const { previewOffered, previewRequested } = usePreviewCalculations(
    extendedMakerAssets,
    extendedTakerAssets
  )

  return {
    orderType,
    ...formState,
    extendedMakerAssets,
    extendedTakerAssets,
    isFormValid,
    addOfferedAsset,
    removeOfferedAsset,
    updateOfferedAsset,
    addRequestedAsset,
    removeRequestedAsset,
    updateRequestedAsset,
    handleSubmit,
    isSubmitting,
    isUploadingToDexie,
    errorMessage,
    successMessage,
    previewOffered,
    previewRequested,
    fee,
    feeDisplayValue,
    handleFeeChange,
    handleFeeBlur,
    feePlaceholder,
  }
}
