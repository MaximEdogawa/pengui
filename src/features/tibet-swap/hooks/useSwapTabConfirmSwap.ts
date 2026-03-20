"use client";

import { useCallback } from "react";
import { useCreateOffer } from "@/features/wallet";
import { CHIA_ASSET_IDS } from "@/shared/lib/constants/chia-assets";
import { logger } from "@/shared/lib/logger";
import { convertToSmallestUnit } from "@/shared/lib/utils/chia-units";
import type { TibetApiPair, TibetQuote } from "../lib/tibetTypes";
import type { TibetCreateOfferVariables } from "./useTibetCreateOffer";

export interface UseSwapTabConfirmSwapOptions {
  quote: TibetQuote | null | undefined;
  selectedPair: TibetApiPair | null;
  modalPayAmount: string;
  xchIsOffered: boolean;
  network: string;
  createOfferMutation: ReturnType<typeof useCreateOffer>;
  tibetCreateOffer: (params: TibetCreateOfferVariables) => Promise<unknown>;
  setSwapError: (v: string) => void;
  setSwapSuccess: (v: boolean) => void;
  setOfferedAmount: (v: string) => void;
  setRequestedAmount: (v: string) => void;
}

export function useSwapTabConfirmSwap(options: UseSwapTabConfirmSwapOptions) {
  const {
    quote,
    selectedPair,
    modalPayAmount,
    xchIsOffered,
    network,
    createOfferMutation,
    tibetCreateOffer,
    setSwapError,
    setSwapSuccess,
    setOfferedAmount,
    setRequestedAmount,
  } = options;

  return useCallback(async () => {
    if (!quote || !selectedPair || !modalPayAmount) return;
    const amountInNum = parseFloat(modalPayAmount) || 0;
    const amountInMojos = xchIsOffered
      ? Math.round(convertToSmallestUnit(amountInNum, "xch"))
      : 0;
    const amountInTokenSmallest = xchIsOffered
      ? 0
      : Math.round(convertToSmallestUnit(amountInNum, "cat"));
    const amountIn = xchIsOffered ? amountInMojos : amountInTokenSmallest;
    if (amountIn <= 0) return;
    setSwapError("");
    setSwapSuccess(false);
    try {
      const xchAssetId =
        network === "testnet" ? CHIA_ASSET_IDS.TXCH : CHIA_ASSET_IDS.XCH;
      const result = await createOfferMutation.mutateAsync({
        walletId: 1,
        offerAssets: xchIsOffered
          ? [{ assetId: xchAssetId, amount: amountInMojos }]
          : [{ assetId: selectedPair.asset_id, amount: amountInTokenSmallest }],
        requestAssets: xchIsOffered
          ? [{ assetId: selectedPair.asset_id, amount: quote.amount_out }]
          : [{ assetId: xchAssetId, amount: quote.amount_out }],
      });
      if (!result?.offer) {
        throw new Error("Wallet did not return a valid offer");
      }
      await tibetCreateOffer({
        pair_id: selectedPair.pair_id,
        offer: result.offer,
        action: "SWAP",
      });
      setSwapSuccess(true);
      setOfferedAmount("");
      setRequestedAmount("");
      setTimeout(() => setSwapSuccess(false), 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Swap failed";
      logger.error("Swap failed", e);
      setSwapError(msg);
    }
  }, [
    quote,
    selectedPair,
    modalPayAmount,
    xchIsOffered,
    network,
    createOfferMutation,
    tibetCreateOffer,
    setSwapError,
    setSwapSuccess,
    setOfferedAmount,
    setRequestedAmount,
  ]);
}
