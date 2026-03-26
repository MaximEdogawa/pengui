"use client";

import { useMemo, useEffect, useRef } from "react";
import { logger } from "@/shared/lib/logger";
import { convertToSmallestUnit } from "@/shared/lib/utils/chia-units";
import type { TibetApiPair } from "../lib/tibetTypes";
import {
  TOKEN_SMALLEST_PER_UNIT,
  formatTibetCatAmountForInput,
  lpToRemoveFromDesiredOutput,
} from "../lib/swapLiquidityMath";
import { useTibetApi } from "./useTibetApi";
import { useTibetOffer } from "./useTibetOffer";

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
  /** Override Tibet's fee estimate with a user-specified value in mojos. */
  manualFee?: number;
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
  onProgrammaticLpSet?: () => void
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
  manualFee,
}: UseLiquidityHandlersArgs) {
  const tibetApi = useTibetApi();
  const tibetOffer = useTibetOffer();
  const isLiquidityPending = tibetOffer.isPending;

  const handleAdd = async () => {
    if (!selectedPair) return;
    const xch = xchIsOffered ? parseFloat(offeredAmount) || 0 : parseFloat(requestedAmount) || 0;
    const token = xchIsOffered ? parseFloat(requestedAmount) || 0 : parseFloat(offeredAmount) || 0;
    if (xch <= 0 || token <= 0) {
      setLiquidityError("Enter both Sell and Buy amounts");
      return;
    }
    setLiquidityError("");
    setLiquiditySuccess(false);
    try {
      // Fetch fresh pair state so amounts match current pool reserves
      const freshPair = await tibetApi.getPair(selectedPair.pair_id);
      if (freshPair.xch_reserve <= 0 || freshPair.token_reserve <= 0 || freshPair.liquidity <= 0) {
        setLiquidityError("Pool has no liquidity, cannot add");
        return;
      }

      const xchMojos = Math.round(convertToSmallestUnit(xch, "xch"));
      const tokenSmallest = Math.round(convertToSmallestUnit(token, "cat"));
      const shareXch = xchMojos / freshPair.xch_reserve;
      const shareToken = tokenSmallest / freshPair.token_reserve;
      const share = Math.min(shareXch, shareToken);

      // Use floor so offer amounts never exceed share * reserve. Round-up would lower
      // the effective share Tibet sees, causing it to mint fewer LP than requested.
      const xchMojosToOffer = Math.floor(share * freshPair.xch_reserve);
      const tokenSmallestToOffer = Math.floor(share * freshPair.token_reserve);
      // Recompute LP from actual offer amounts — mirrors Tibet's AMM formula exactly.
      const lpReceiveSmallest = Math.floor(
        Math.min(
          xchMojosToOffer / freshPair.xch_reserve,
          tokenSmallestToOffer / freshPair.token_reserve
        ) * freshPair.liquidity
      );

      if (xchMojosToOffer <= 0 || tokenSmallestToOffer <= 0 || lpReceiveSmallest <= 0) {
        setLiquidityError("Amounts too small, increase XCH or token input");
        return;
      }

      // Use manual fee if set, otherwise ask Tibet for an estimate
      let fee: number | undefined = manualFee;
      if (fee === undefined) {
        const feeQuote = await tibetApi.getQuote({
          pair_id: freshPair.pair_id,
          amount_in: xchMojosToOffer,
          xch_is_input: true,
          estimate_fee: true,
        });
        fee = feeQuote.fee ?? undefined;
      }

      // Give XCH + token, receive LP tokens
      await tibetOffer.addLiquidity({
        pair: freshPair,
        xchAmount: xchMojosToOffer,
        tokenAmount: tokenSmallestToOffer,
        lpAmount: lpReceiveSmallest,
        fee,
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
    const lp = parseFloat(lpAmount) || 0;

    if (xchDisplay <= 0 && tokenDisplay <= 0 && lp <= 0) {
      setLiquidityError("Enter LP amount or both Sell and Buy amounts");
      return;
    }

    setLiquidityError("");
    setLiquiditySuccess(false);

    try {
      // Fetch fresh pair state so amounts match current pool reserves
      const freshPair = await tibetApi.getPair(selectedPair.pair_id);
      if (freshPair.liquidity <= 0) {
        setLiquidityError("Pool has no liquidity");
        return;
      }

      let lpSmallest: number;
      if (xchDisplay > 0 && tokenDisplay > 0) {
        const computed = lpToRemoveFromDesiredOutput(freshPair, xchDisplay, tokenDisplay);
        if (computed == null || computed <= 0) {
          setLiquidityError("Amounts should match pool ratio (use Sell and Buy)");
          return;
        }
        lpSmallest = computed;
      } else {
        lpSmallest = Math.round(convertToSmallestUnit(lp, "cat"));
      }

      const removeShare = lpSmallest / freshPair.liquidity;
      // Use floor so we never request more than the AMM formula yields
      const xchMojosExpected = Math.floor(freshPair.xch_reserve * removeShare);
      const tokenSmallestExpected = Math.floor(freshPair.token_reserve * removeShare);

      if (xchMojosExpected <= 0 || tokenSmallestExpected <= 0) {
        setLiquidityError("LP amount too small to withdraw meaningful funds");
        return;
      }

      // Use manual fee if set, otherwise ask Tibet for an estimate
      let fee: number | undefined = manualFee;
      if (fee === undefined) {
        const feeQuote = await tibetApi.getQuote({
          pair_id: freshPair.pair_id,
          amount_out: xchMojosExpected,
          xch_is_input: false,
          estimate_fee: true,
        });
        fee = feeQuote.fee ?? undefined;
      }

      // Give LP tokens, receive XCH + token
      await tibetOffer.removeLiquidity({
        pair: freshPair,
        lpAmount: lpSmallest,
        xchAmount: xchMojosExpected,
        tokenAmount: tokenSmallestExpected,
        fee,
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
