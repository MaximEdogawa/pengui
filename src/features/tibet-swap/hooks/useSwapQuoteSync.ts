"use client";

import { useMemo, useEffect, useRef } from "react";
import { useTibetQuote } from "./useTibetQuote";
import { convertToSmallestUnit, MOJOS_PER_XCH, mojosToXch } from "@/shared/lib/utils/chia-units";
import type { TibetApiPair } from "../lib/tibetTypes";
import { computePriceImpactPercent } from "../lib/priceImpact";
import {
  TOKEN_SMALLEST_PER_UNIT,
  formatSwapPrice,
  formatTibetCatAmountForInput,
} from "../lib/swapLiquidityMath";

/** True while the user is typing an incomplete decimal (e.g. "1." or "") so we don't overwrite the other side. */
function isIntermediateAmountInput(s: string): boolean {
  const t = s.trim();
  if (t === "" || t === "." || t === ",") return true;
  return t.endsWith(".") || t.endsWith(",");
}

const QUOTE_SYNC_DEBOUNCE_MS = 320;

interface UseSwapQuoteSyncArgs {
  selectedPair: TibetApiPair | null;
  amountDriver: "offered" | "requested";
  xchIsOffered: boolean;
  offeredAmount: string;
  requestedAmount: string;
  setOfferedAmount: (v: string) => void;
  setRequestedAmount: (v: string) => void;
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

  const offeredAmountRef = useRef(offeredAmount);
  const requestedAmountRef = useRef(requestedAmount);
  offeredAmountRef.current = offeredAmount;
  requestedAmountRef.current = requestedAmount;

  useEffect(() => {
    if (!quote || skipQuoteSync) return;
    const driverStr =
      amountDriver === "offered" ? offeredAmountRef.current : requestedAmountRef.current;
    if (isIntermediateAmountInput(driverStr)) return;

    const timer = window.setTimeout(() => {
      const driverNow =
        amountDriver === "offered" ? offeredAmountRef.current : requestedAmountRef.current;
      if (isIntermediateAmountInput(driverNow)) return;
      if (!quote || skipQuoteSync) return;
      if (amountDriver === "offered" && quote.amount_out > 0) {
        if (xchIsOffered) {
          const tokenUnits = quote.amount_out / TOKEN_SMALLEST_PER_UNIT;
          setRequestedAmount(formatTibetCatAmountForInput(tokenUnits));
        } else {
          setRequestedAmount(mojosToXch(quote.amount_out).toFixed(6));
        }
      }
      if (amountDriver === "requested" && quote.amount_in > 0) {
        if (xchIsOffered) {
          setOfferedAmount(mojosToXch(quote.amount_in).toFixed(6));
        } else {
          const tokenUnits = quote.amount_in / TOKEN_SMALLEST_PER_UNIT;
          setOfferedAmount(formatTibetCatAmountForInput(tokenUnits));
        }
      }
    }, QUOTE_SYNC_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [
    quote,
    amountDriver,
    xchIsOffered,
    setOfferedAmount,
    setRequestedAmount,
    skipQuoteSync,
    offeredAmount,
    requestedAmount,
  ]);

  const modalPayAmount =
    amountDriver === "offered"
      ? offeredAmount
      : quote && quote.amount_in > 0
        ? xchIsOffered
          ? mojosToXch(quote.amount_in).toFixed(6)
          : formatTibetCatAmountForInput(quote.amount_in / TOKEN_SMALLEST_PER_UNIT)
        : "";

  const priceLine = useMemo(() => {
    if (!selectedPair || !quote || quote.amount_out <= 0) return null;
    const tokenName = selectedPair.asset_short_name || selectedPair.asset_name;
    if (xchIsOffered) {
      const xchPerToken =
        quote.amount_in / MOJOS_PER_XCH / (quote.amount_out / TOKEN_SMALLEST_PER_UNIT);
      return `1 ${tokenName} = ${formatSwapPrice(xchPerToken)} XCH`;
    }
    const tokenPerXch =
      quote.amount_out / MOJOS_PER_XCH / (quote.amount_in / TOKEN_SMALLEST_PER_UNIT);
    return `1 XCH = ${formatSwapPrice(tokenPerXch)} ${tokenName}`;
  }, [selectedPair, quote, xchIsOffered]);

  const liquidityFeePercent =
    selectedPair && selectedPair.inverse_fee > 0
      ? (100 / selectedPair.inverse_fee).toFixed(2)
      : "—";

  const priceImpactPercent = quote != null ? computePriceImpactPercent(quote) : null;

  return {
    quote,
    modalPayAmount,
    priceLine,
    priceImpactPercent,
    liquidityFeePercent,
  };
}
