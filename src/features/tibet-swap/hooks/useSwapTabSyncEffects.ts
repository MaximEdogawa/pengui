"use client";

import {
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from "react";
import type { OrderBookOrder } from "@/features/trading/lib/orderBookTypes";
import type { TibetApiPair } from "../lib/tibetTypes";
import { isXchTicker } from "../lib/tibetUiUtils";
import { formatTibetCatAmountForInput } from "../lib/swapLiquidityMath";

type LpRemoveReceive = { xch: number; token: number };

export interface UseSwapTabOrderPrefillOptions {
  selectedOrderForTaking: OrderBookOrder | null;
  currentSell: string;
  currentBuy: string;
  setLpAmount: (v: string) => void;
  setOfferedAmount: (v: string) => void;
  setRequestedAmount: (v: string) => void;
  setAmountDriver: Dispatch<SetStateAction<"offered" | "requested">>;
}

/** Fill amount values from order book only; never change asset filters (sell/buy). */
export function useSwapTabOrderPrefill(options: UseSwapTabOrderPrefillOptions) {
  const {
    selectedOrderForTaking,
    currentSell,
    currentBuy,
    setLpAmount,
    setOfferedAmount,
    setRequestedAmount,
    setAmountDriver,
  } = options;
  useEffect(() => {
    const order = selectedOrderForTaking;
    if (!order?.id || !order.requesting?.length || !order.offering?.length)
      return;
    if (!currentSell || !currentBuy) return;
    const req = order.requesting[0];
    const off = order.offering[0];
    const reqTicker = ((req.code ?? req.id) || "").toLowerCase();
    const offTicker = ((off.code ?? off.id) || "").toLowerCase();
    if (!reqTicker || !offTicker) return;

    const orderSet = new Set([reqTicker, offTicker]);
    const filterSet = new Set([
      currentSell.toLowerCase(),
      currentBuy.toLowerCase(),
    ]);
    if (
      orderSet.size !== 2 ||
      filterSet.size !== 2 ||
      ![...orderSet].every((a) => filterSet.has(a))
    )
      return;

    setLpAmount("");
    const reqIsXch = isXchTicker(req.code ?? req.id);
    const offIsXch = isXchTicker(off.code ?? off.id);
    const sellIsXch = isXchTicker(currentSell);
    if (reqIsXch && sellIsXch) {
      setOfferedAmount(String(req.amount));
      setRequestedAmount("");
      setAmountDriver("offered");
    } else if (offIsXch && sellIsXch) {
      setOfferedAmount(String(off.amount));
      setRequestedAmount("");
      setAmountDriver("offered");
    } else if (reqIsXch && !sellIsXch) {
      setOfferedAmount("");
      setRequestedAmount(String(req.amount));
      setAmountDriver("requested");
    } else if (offIsXch && !sellIsXch) {
      setOfferedAmount("");
      setRequestedAmount(String(off.amount));
      setAmountDriver("requested");
    } else {
      setOfferedAmount("");
      setRequestedAmount("");
    }
  }, [selectedOrderForTaking, currentSell, currentBuy, setLpAmount, setOfferedAmount, setRequestedAmount, setAmountDriver]);
}

/** Pair is only set via the filter bar: one CAT + XCH/TXCH (both count as native for testnet/mainnet) */
export function useSwapTabPairFromFilters(
  filters: { buyAsset?: string[]; sellAsset?: string[] } | undefined,
  allPairs: TibetApiPair[],
  selectedPair: TibetApiPair | null,
  setSelectedPair: Dispatch<SetStateAction<TibetApiPair | null>>,
) {
  useEffect(() => {
    const buy = filters?.buyAsset ?? [];
    const sell = filters?.sellAsset ?? [];
    const allTickers = [...buy, ...sell];
    const tokenTickers = allTickers.filter((tk) => !isXchTicker(tk));
    if (tokenTickers.length !== 1 || allPairs.length === 0) {
      setSelectedPair(null);
      return;
    }
    const tokenTicker = tokenTickers[0];
    const match = allPairs.find((p) => {
      const pt = (p.asset_short_name || p.asset_name || "").toLowerCase();
      const tok = tokenTicker.toLowerCase();
      return pt === tok || pt.includes(tok) || tok.includes(pt);
    });
    if (match && selectedPair?.pair_id !== match.pair_id)
      setSelectedPair(match);
    if (!match) setSelectedPair(null);
  }, [
    filters?.buyAsset,
    filters?.sellAsset,
    allPairs,
    selectedPair?.pair_id,
    setSelectedPair,
  ]);
}

/** When LP remove amount is set, drive Sell/Buy amounts from pool estimate. */
export interface UseSwapTabLpRemoveAmountsSyncOptions {
  removeReceive: LpRemoveReceive | null;
  selectedPair: TibetApiPair | null;
  lpAmount: string;
  xchIsOffered: boolean;
  setOfferedAmount: (v: string) => void;
  setRequestedAmount: (v: string) => void;
  amountsFromLpRef: MutableRefObject<boolean>;
  lpJustSetFromAmountsRef: MutableRefObject<boolean>;
  /**
   * When false, Sell/Buy are not driven from LP remove math (auto LP from swap).
   * When true, user typed LP — drive Sell/Buy from remove estimate.
   */
  lpEditedByUserRef: RefObject<boolean>;
}

export function useSwapTabLpRemoveAmountsSync(
  options: UseSwapTabLpRemoveAmountsSyncOptions,
) {
  const {
    removeReceive,
    selectedPair,
    lpAmount,
    xchIsOffered,
    setOfferedAmount,
    setRequestedAmount,
    amountsFromLpRef,
    lpJustSetFromAmountsRef,
    lpEditedByUserRef,
  } = options;
  useEffect(() => {
    if (lpJustSetFromAmountsRef.current) {
      lpJustSetFromAmountsRef.current = false;
      return;
    }
    if (!lpEditedByUserRef.current) return;
    if (
      !removeReceive ||
      !selectedPair ||
      lpAmount.trim() === "" ||
      parseFloat(lpAmount) <= 0
    )
      return;
    amountsFromLpRef.current = true;
    const xchStr = removeReceive.xch.toFixed(6);
    const tokenStr = formatTibetCatAmountForInput(removeReceive.token);
    if (xchIsOffered) {
      setOfferedAmount(xchStr);
      setRequestedAmount(tokenStr);
    } else {
      setOfferedAmount(tokenStr);
      setRequestedAmount(xchStr);
    }
  }, [
    removeReceive,
    lpAmount,
    selectedPair,
    xchIsOffered,
    setOfferedAmount,
    setRequestedAmount,
    amountsFromLpRef,
    lpJustSetFromAmountsRef,
  ]);
}
