"use client";

import { useCallback } from "react";
import { logger } from "@/shared/lib/logger";
import { convertToSmallestUnit } from "@/shared/lib/utils/chia-units";
import { CHIA_ASSET_IDS } from "@/shared/lib/constants/chia-assets";
import type { TibetApiPair, TibetQuote } from "../lib/tibetTypes";
import { useTibetOffer } from "./useTibetOffer";

export interface UseSwapTabConfirmSwapOptions {
  quote: TibetQuote | null | undefined;
  selectedPair: TibetApiPair | null;
  modalPayAmount: string;
  xchIsOffered: boolean;
  network: string;
  manualFee?: number;
  setSwapError: (v: string) => void;
  setSwapSuccess: (v: boolean) => void;
  setOfferedAmount: (v: string) => void;
  setRequestedAmount: (v: string) => void;
}

export function useSwapTabConfirmSwap({
  quote,
  selectedPair,
  modalPayAmount,
  xchIsOffered,
  network,
  manualFee,
  setSwapError,
  setSwapSuccess,
  setOfferedAmount,
  setRequestedAmount,
}: UseSwapTabConfirmSwapOptions) {
  const tibetOffer = useTibetOffer();

  const handleConfirmSwap = useCallback(async () => {
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

      // Tibet's server-computed amount_out is used as receiveAmount so the
      // offer amounts match exactly what Tibet expects when taking the offer.
      await tibetOffer.swap({
        pair: selectedPair,
        giveAssetId: xchIsOffered ? xchAssetId : selectedPair.asset_id,
        giveAmount: xchIsOffered ? amountInMojos : amountInTokenSmallest,
        receiveAssetId: xchIsOffered ? selectedPair.asset_id : xchAssetId,
        receiveAmount: quote.amount_out,
        fee: manualFee,
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
    manualFee,
    tibetOffer,
    setSwapError,
    setSwapSuccess,
    setOfferedAmount,
    setRequestedAmount,
  ]);

  return { handleConfirmSwap, isSwapPending: tibetOffer.isPending };
}
