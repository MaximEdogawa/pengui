"use client";

import { type OfferAsset, type OfferDetails } from "@/entities/offer";
import { useTakeOffer } from "@/features/wallet";
import { useCallback } from "react";
import { offerStorageService } from "@/shared/lib/services/offerStorageService";
import { useWalletAddress } from "@/features/wallet/hooks/useWalletQueries";
import { type OrderBookOrder } from "@/features/trading/lib/orderBookTypes";

interface UseMarketOfferSubmissionProps {
  formState: {
    offerString: string;
    fee: number;
    setErrorMessage: (msg: string) => void;
    setSuccessMessage: (msg: string) => void;
    setIsSubmitting: (value: boolean) => void;
    resetForm: () => void;
  };
  isFormValid: boolean;
  offerPreview: {
    assetsOffered?: OfferAsset[];
    assetsRequested?: OfferAsset[];
    fee?: number;
    creatorAddress?: string;
  } | null;
  onOfferTaken?: (offer: OfferDetails) => void;
  onClose?: () => void;
  mode?: "modal" | "inline";
  order?: OrderBookOrder;
}

// Helper function to create taken offer
function createTakenOffer(
  tradeId: string | undefined,
  offerString: string,
  fee: number,
  offerPreview: UseMarketOfferSubmissionProps["offerPreview"],
  dexieOfferId?: string,
): OfferDetails {
  return {
    id: Date.now().toString(),
    tradeId,
    dexieOfferId,
    pendingConfirmation: !tradeId,
    offerString: offerString.trim(),
    status: "pending",
    createdAt: new Date(),
    assetsOffered: offerPreview?.assetsOffered || [],
    assetsRequested: offerPreview?.assetsRequested || [],
    fee: offerPreview?.fee || fee,
    creatorAddress: offerPreview?.creatorAddress || "unknown",
  };
}

// Helper function to save taken offer
async function saveTakenOffer(
  offer: OfferDetails,
  walletAddress: string,
): Promise<void> {
  await offerStorageService.saveOffer(offer, true, walletAddress);
  await offerStorageService.markOfferAsTaken(offer.id, walletAddress);
}

export function useMarketOfferSubmission({
  formState,
  isFormValid,
  offerPreview,
  onOfferTaken,
  onClose,
  mode,
  order,
}: UseMarketOfferSubmissionProps) {
  const takeOfferMutation = useTakeOffer();
  const { data: walletData } = useWalletAddress();
  const walletAddress = walletData?.address;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      formState.setErrorMessage("");
      formState.setSuccessMessage("");

      if (!isFormValid) {
        formState.setErrorMessage("Please enter a valid offer string and fee");
        return;
      }

      formState.setIsSubmitting(true);

      try {
        const result = await takeOfferMutation.mutateAsync({
          offer: formState.offerString.trim(),
          feeInXch: formState.fee,
        });

        // Handle different response structures from the wallet
        const resultData = result as {
          tradeId?: string;
          data?: { tradeId?: string };
          success?: boolean;
        };
        const tradeId = resultData?.tradeId || resultData?.data?.tradeId;
        const isSuccess = result?.success !== false;

        if (tradeId) {
          const takenOffer = createTakenOffer(
            tradeId,
            formState.offerString,
            formState.fee,
            offerPreview,
            order?.id,
          );

          // Save offer to IndexedDB with takenBy field
          if (walletAddress) {
            try {
              await saveTakenOffer(takenOffer, walletAddress);
            } catch {
              // Error is silently handled to not interrupt user flow
            }
          }

          formState.setSuccessMessage("Offer taken successfully!");
          onOfferTaken?.(takenOffer);

          setTimeout(() => {
            formState.resetForm();
            if (mode === "modal" && onClose) {
              onClose();
            }
          }, 1500);
        } else if (isSuccess && result) {
          const takenOffer = createTakenOffer(
            undefined,
            formState.offerString,
            formState.fee,
            offerPreview,
            order?.id,
          );

          formState.setSuccessMessage("Offer accepted! Processing...");
          onOfferTaken?.(takenOffer);

          setTimeout(() => {
            formState.resetForm();
            if (mode === "modal" && onClose) {
              onClose();
            }
          }, 1500);
        } else {
          throw new Error("Failed to take market offer - no tradeId returned");
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error occurred";
        formState.setErrorMessage(`Failed to take market offer: ${errorMsg}`);
      } finally {
        formState.setIsSubmitting(false);
      }
    },
    [
      formState,
      isFormValid,
      takeOfferMutation,
      offerPreview,
      onOfferTaken,
      onClose,
      mode,
      walletAddress,
      order?.id,
    ],
  );

  return { handleSubmit };
}
