"use client";

import { useMemo, useEffect } from "react";
import { useTibetQuote } from "./useTibetQuote";
import {
  convertToSmallestUnit,
  MOJOS_PER_XCH,
  mojosToXch,
} from "@/shared/lib/utils/chia-units";
import type { TibetApiPair } from "../lib/tibetTypes";
import { computePriceImpactPercent } from "../lib/priceImpact";
import {
  TOKEN_SMALLEST_PER_UNIT,
  formatSwapPrice,
} from "../lib/swapLiquidityMath";

interface UseSwapQuoteSyncArgs {
  selectedPair: TibetApiPair | null;
  amountDriver: "offered" | "requested";
  xchIsOffered: boolean;
  offeredAmount: string;
  requestedAmount: string;
  setOfferedAmount: (v: string) => void;
  setRequestedAmount: (v: string) => void;
  /** When true, do not overwrite offered/requested from quote (e.g. when LP amount drives the form) */
  skipQuoteSync?: boolean;
}

export function useSwapQuoteSync({
  selectedPair,
  amountDriver,
  xchIsOffered,
  offeredAmount,
  requestedAmount,
  setOfferedAmount,
  setRequestedAmount,
  skipQuoteSync = false,
}: UseSwapQuoteSyncArgs) {
  const offeredAmountNum = parseFloat(offeredAmount) || 0;
  const requestedAmountNum = parseFloat(requestedAmount) || 0;
  const amountInMojos = xchIsOffered
    ? Math.round(convertToSmallestUnit(offeredAmountNum, "xch"))
    : 0;
  const amountInTokenSmallest = xchIsOffered
    ? 0
    : Math.round(convertToSmallestUnit(offeredAmountNum, "cat"));
  const amountOutTokenSmallest = xchIsOffered
    ? Math.round(convertToSmallestUnit(requestedAmountNum, "cat"))
    : 0;
  const amountOutMojos = xchIsOffered
    ? 0
    : Math.round(convertToSmallestUnit(requestedAmountNum, "xch"));

  const quoteParams = useMemo(() => {
    if (!selectedPair) return null;
    if (amountDriver === "offered") {
      const amt = xchIsOffered ? amountInMojos : amountInTokenSmallest;
      if (amt <= 0) return null;
      return {
        pair_id: selectedPair.pair_id,
        amount_in: amt,
        amount_out: undefined,
        xch_is_input: xchIsOffered,
        estimate_fee: true,
      };
    }
    const amt = xchIsOffered ? amountOutTokenSmallest : amountOutMojos;
    if (amt <= 0) return null;
    return {
      pair_id: selectedPair.pair_id,
      amount_in: undefined,
      amount_out: amt,
      xch_is_input: xchIsOffered,
      estimate_fee: true,
    };
  }, [
    selectedPair,
    amountDriver,
    xchIsOffered,
    amountInMojos,
    amountInTokenSmallest,
    amountOutTokenSmallest,
    amountOutMojos,
  ]);

  const { data: quote } = useTibetQuote(quoteParams);

  useEffect(() => {
    if (!quote || skipQuoteSync) return;
    if (amountDriver === "offered" && quote.amount_out > 0) {
      if (xchIsOffered) {
        const tokenUnits = quote.amount_out / TOKEN_SMALLEST_PER_UNIT;
        setRequestedAmount(
          tokenUnits >= 1 ? tokenUnits.toFixed(4) : tokenUnits.toFixed(6),
        );
      } else {
        setRequestedAmount(mojosToXch(quote.amount_out).toFixed(6));
      }
    }
    if (amountDriver === "requested" && quote.amount_in > 0) {
      if (xchIsOffered) {
        setOfferedAmount(mojosToXch(quote.amount_in).toFixed(6));
      } else {
        const tokenUnits = quote.amount_in / TOKEN_SMALLEST_PER_UNIT;
        setOfferedAmount(
          tokenUnits >= 1 ? tokenUnits.toFixed(4) : tokenUnits.toFixed(6),
        );
      }
    }
  }, [
    quote,
    amountDriver,
    xchIsOffered,
    setOfferedAmount,
    setRequestedAmount,
    skipQuoteSync,
  ]);

  const modalPayAmount =
    amountDriver === "offered"
      ? offeredAmount
      : quote && quote.amount_in > 0
        ? xchIsOffered
          ? mojosToXch(quote.amount_in).toFixed(6)
          : quote.amount_in / TOKEN_SMALLEST_PER_UNIT >= 1
            ? (quote.amount_in / TOKEN_SMALLEST_PER_UNIT).toFixed(4)
            : (quote.amount_in / TOKEN_SMALLEST_PER_UNIT).toFixed(6)
        : "";

  const priceLine = useMemo(() => {
    if (!selectedPair || !quote || quote.amount_out <= 0) return null;
    const tokenName = selectedPair.asset_short_name || selectedPair.asset_name;
    if (xchIsOffered) {
      const xchPerToken =
        quote.amount_in /
        MOJOS_PER_XCH /
        (quote.amount_out / TOKEN_SMALLEST_PER_UNIT);
      return `1 ${tokenName} = ${formatSwapPrice(xchPerToken)} XCH`;
    }
    const tokenPerXch =
      quote.amount_out /
      MOJOS_PER_XCH /
      (quote.amount_in / TOKEN_SMALLEST_PER_UNIT);
    return `1 XCH = ${formatSwapPrice(tokenPerXch)} ${tokenName}`;
  }, [selectedPair, quote, xchIsOffered]);

  const liquidityFeePercent =
    selectedPair && selectedPair.inverse_fee > 0
      ? (100 / selectedPair.inverse_fee).toFixed(2)
      : "—";

  const priceImpactPercent =
    quote != null ? computePriceImpactPercent(quote) : null;

  return {
    quote,
    modalPayAmount,
    priceLine,
    priceImpactPercent,
    liquidityFeePercent,
  };
}
