"use client";

import { useMemo, useEffect, useRef } from "react";
import { useCreateOffer } from "@/features/wallet";
import { CHIA_ASSET_IDS } from "@/shared/lib/constants/chia-assets";
import { logger } from "@/shared/lib/logger";
import { convertToSmallestUnit } from "@/shared/lib/utils/chia-units";
import type { TibetApiPair, TibetOfferResponse } from "../lib/tibetTypes";
import {
  TOKEN_SMALLEST_PER_UNIT,
  formatTibetCatAmountForInput,
  lpToRemoveFromDesiredOutput,
} from "../lib/swapLiquidityMath";

export interface UseLiquidityHandlersArgs {
  network: string;
  selectedPair: TibetApiPair | null;
  offeredAmount: string;
  requestedAmount: string;
  setOfferedAmount: (v: string) => void;
  setRequestedAmount: (v: string) => void;
  xchIsOffered: boolean;
  lpAmount: string;
  setLpAmount: (v: string) => void;
  setLiquidityError: (v: string) => void;
  setLiquiditySuccess: (v: boolean) => void;
  createOfferMutation: ReturnType<typeof useCreateOffer>;
  tibetCreateOffer: (params: {
    pair_id: string;
    offer: string;
    action: "ADD_LIQUIDITY" | "REMOVE_LIQUIDITY";
  }) => Promise<TibetOfferResponse>;
  isTibetCreating: boolean;
}

/**
 * Estimated LP from current Sell/Buy (add-liquidity share) and sync into the LP field.
 * `onProgrammaticLpSet` marks LP as not user-typed so remove-LP sync does not overwrite XCH.
 * Refs coordinate with `useSwapTabLpRemoveAmountsSync` to avoid feedback loops.
 */
export function useAddLpReceiveAndSync(
  selectedPair: TibetApiPair | null,
  offeredAmount: string,
  requestedAmount: string,
  xchIsOffered: boolean,
  setLpAmount: (v: string) => void,
  onProgrammaticLpSet?: () => void,
) {
  const addLpReceive = useMemo(() => {
    if (
      !selectedPair ||
      selectedPair.liquidity <= 0 ||
      selectedPair.xch_reserve <= 0 ||
      selectedPair.token_reserve <= 0
    )
      return undefined;
    const offered = parseFloat(offeredAmount) || 0;
    const requested = parseFloat(requestedAmount) || 0;
    if (offered <= 0 || requested <= 0) return undefined;
    const xchMojos = xchIsOffered
      ? Math.round(convertToSmallestUnit(offered, "xch"))
      : Math.round(convertToSmallestUnit(requested, "xch"));
    const tokenSmallest = xchIsOffered
      ? Math.round(convertToSmallestUnit(requested, "cat"))
      : Math.round(convertToSmallestUnit(offered, "cat"));
    const shareXch = xchMojos / selectedPair.xch_reserve;
    const shareToken = tokenSmallest / selectedPair.token_reserve;
    const share = Math.min(shareXch, shareToken);
    const lpSmallest = Math.floor(share * selectedPair.liquidity);
    return formatTibetCatAmountForInput(lpSmallest / TOKEN_SMALLEST_PER_UNIT);
  }, [selectedPair, offeredAmount, requestedAmount, xchIsOffered]);
  const amountsFromLpRef = useRef(false);
  const lpJustSetFromAmountsRef = useRef(false);
  useEffect(() => {
    if (amountsFromLpRef.current) {
      amountsFromLpRef.current = false;
      return;
    }
    if (addLpReceive == null) return;
    onProgrammaticLpSet?.();
    lpJustSetFromAmountsRef.current = true;
    setLpAmount(addLpReceive);
  }, [addLpReceive, setLpAmount, onProgrammaticLpSet]);
  return { addLpReceive, amountsFromLpRef, lpJustSetFromAmountsRef };
}

export function useLiquidityHandlers({
  network,
  selectedPair,
  offeredAmount,
  requestedAmount,
  setOfferedAmount,
  setRequestedAmount,
  xchIsOffered,
  lpAmount,
  setLpAmount,
  setLiquidityError,
  setLiquiditySuccess,
  createOfferMutation,
  tibetCreateOffer,
  isTibetCreating,
}: UseLiquidityHandlersArgs) {
  const isLiquidityPending = createOfferMutation.isPending || isTibetCreating;

  const handleAdd = async () => {
    if (!selectedPair) return;
    const xch = xchIsOffered
      ? parseFloat(offeredAmount) || 0
      : parseFloat(requestedAmount) || 0;
    const token = xchIsOffered
      ? parseFloat(requestedAmount) || 0
      : parseFloat(offeredAmount) || 0;
    if (xch <= 0 || token <= 0) {
      setLiquidityError("Enter both Sell and Buy amounts");
      return;
    }
    setLiquidityError("");
    setLiquiditySuccess(false);
    try {
      const xchAssetId =
        network === "testnet" ? CHIA_ASSET_IDS.TXCH : CHIA_ASSET_IDS.XCH;
      const xchMojos = Math.round(convertToSmallestUnit(xch, "xch"));
      const tokenSmallest = Math.round(convertToSmallestUnit(token, "cat"));
      const result = await createOfferMutation.mutateAsync({
        walletId: 1,
        offerAssets: [
          { assetId: xchAssetId, amount: xchMojos },
          { assetId: selectedPair.asset_id, amount: tokenSmallest },
        ],
        requestAssets: [],
      });
      if (!result?.offer)
        throw new Error("Wallet did not return a valid offer");
      await tibetCreateOffer({
        pair_id: selectedPair.pair_id,
        offer: result.offer,
        action: "ADD_LIQUIDITY",
      });
      setLiquiditySuccess(true);
      setOfferedAmount("");
      setRequestedAmount("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Add liquidity failed";
      logger.error("Add liquidity failed", e);
      setLiquidityError(msg);
    }
  };

  const handleRemove = async () => {
    if (!selectedPair) return;
    const xchDisplay = xchIsOffered
      ? parseFloat(offeredAmount) || 0
      : parseFloat(requestedAmount) || 0;
    const tokenDisplay = xchIsOffered
      ? parseFloat(requestedAmount) || 0
      : parseFloat(offeredAmount) || 0;
    let lpSmallest: number;
    if (xchDisplay > 0 && tokenDisplay > 0) {
      const computed = lpToRemoveFromDesiredOutput(
        selectedPair,
        xchDisplay,
        tokenDisplay,
      );
      if (computed == null || computed <= 0) {
        setLiquidityError(
          "Amounts should match pool ratio (use Sell and Buy)",
        );
        return;
      }
      lpSmallest = computed;
    } else {
      const lp = parseFloat(lpAmount) || 0;
      if (lp <= 0) {
        setLiquidityError(
          "Enter LP amount or both Sell and Buy amounts",
        );
        return;
      }
      lpSmallest = Math.round(convertToSmallestUnit(lp, "cat"));
    }
    setLiquidityError("");
    setLiquiditySuccess(false);
    try {
      const xchAssetId =
        network === "testnet" ? CHIA_ASSET_IDS.TXCH : CHIA_ASSET_IDS.XCH;
      const result = await createOfferMutation.mutateAsync({
        walletId: 1,
        offerAssets: [
          { assetId: selectedPair.liquidity_asset_id, amount: lpSmallest },
        ],
        requestAssets: [
          { assetId: xchAssetId, amount: 1 },
          { assetId: selectedPair.asset_id, amount: 1 },
        ],
      });
      if (!result?.offer)
        throw new Error("Wallet did not return a valid offer");
      await tibetCreateOffer({
        pair_id: selectedPair.pair_id,
        offer: result.offer,
        action: "REMOVE_LIQUIDITY",
      });
      setLiquiditySuccess(true);
      setLpAmount("");
      setOfferedAmount("");
      setRequestedAmount("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Remove liquidity failed";
      logger.error("Remove liquidity failed", e);
      setLiquidityError(msg);
    }
  };

  return { handleAdd, handleRemove, isLiquidityPending };
}
