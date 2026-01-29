"use client";

import type { OfferDetails } from "@/entities/offer";
import { useThemeClasses } from "@/shared/hooks";
import type {
  OrderBookFilters,
  OrderBookOrder,
} from "../../../lib/orderBookTypes";
import { useOrderBookOfferSubmission } from "../../../hooks/useOrderBookOfferSubmission";
import { useCreateOfferFormData } from "@/features/trading/hooks/useCreateOfferFormData";
import { OfferPreview } from "../../componets/create-offer-form/OfferPreview";
import { FeeInput } from "../../componets/create-offer-form/FeeInput";
import { FormActionButtons } from "../../componets/create-offer-form/FormActionButtons";
import { AssetSections } from "../../componets/create-offer-form/AssetSections";
import { PriceAdjustmentSliders } from "../../componets/create-offer-form/PriceAdjustmentSliders";
import { FormMessages } from "../../componets/create-offer-form/FormMessages";
import { AdvancedSettings } from "../../componets/create-offer-form/AdvancedSettings";

interface CreateOfferFormProps {
  order?: OrderBookOrder;
  onOfferCreated?: (offer: OfferDetails) => void;
  onClose?: () => void;
  mode?: "modal" | "inline";
  initialPriceAdjustments?: { requested: number; offered: number };
  onOpenModal?: () => void;
  filters?: OrderBookFilters;
}

export default function CreateOfferForm({
  order,
  onOfferCreated,
  onClose,
  mode = "inline",
  initialPriceAdjustments,
  onOpenModal,
  filters,
}: CreateOfferFormProps) {
  const { t } = useThemeClasses();

  const {
    makerAssets,
    setMakerAssets,
    takerAssets,
    setTakerAssets,
    useAsTemplate,
    resetForm,
  } = useOrderBookOfferSubmission();

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
  });

  const containerClass = mode === "modal" ? "space-y-4" : "space-y-3";

  return (
    <div className={containerClass}>
      <form onSubmit={formData.handleSubmit} className={containerClass}>
        <OfferPreview
          offeredAssets={formData.extendedMakerAssets.filter(
            (a) => a.assetId || a.type === "xch",
          )}
          requestedAssets={formData.extendedTakerAssets.filter(
            (a) => a.assetId || a.type === "xch",
          )}
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

        {mode === "modal" && (
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
  );
}
