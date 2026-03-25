"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { useThemeClasses } from "@/shared/hooks";
import { useNetwork } from "@/shared/hooks/useNetwork";
import { getNativeTokenTickerForNetwork } from "@/shared/lib/config/environment";
import {
  useTibetPairs,
  useTibetCreateOffer,
  useSwapQuoteSync,
  useLiquidityHandlers,
  useAddLpReceiveAndSync,
  useSwapTabOrderPrefill,
  useSwapTabPairFromFilters,
  useSwapTabLpRemoveAmountsSync,
  useSwapTabConfirmSwap,
} from "../hooks";
import { useCreateOffer } from "@/features/wallet";
import { useOrderBookFilters } from "@/features/trading/hooks/useOrderBookFilters";
import { useSelectedOrder } from "@/features/trading/hooks/SelectedOrderProvider";
import { isXchTicker } from "../lib/tibetUiUtils";
import { removeReceiveEstimate } from "../lib/swapLiquidityMath";
import { SwapFormBody } from "./SwapFormBody";
import type { TibetApiPair } from "../lib/tibetTypes";

interface SwapTabContentProps {
  /** When true, render only the swap form (no sub-tabs, no extra card) to match Limit/Market layout */
  mode?: "inline";
}

export function SwapTabContent({ mode }: SwapTabContentProps = {}) {
  const { t } = useThemeClasses();
  const { network } = useNetwork();
  const { filters } = useOrderBookFilters();
  const { selectedOrderForTaking } = useSelectedOrder();
  const [selectedPair, setSelectedPair] = useState<TibetApiPair | null>(null);
  const [offeredAmount, setOfferedAmount] = useState("");
  const [requestedAmount, setRequestedAmount] = useState("");
  const [amountDriver, setAmountDriver] = useState<"offered" | "requested">(
    "offered",
  );
  const [lpAmount, setLpAmount] = useState("");
  const [liquidityError, setLiquidityError] = useState("");
  const [liquiditySuccess, setLiquiditySuccess] = useState(false);
  const [swapError, setSwapError] = useState("");
  const [swapSuccess, setSwapSuccess] = useState(false);

  /** True when LP amount was typed for remove liquidity; quote sync must not overwrite Sell/Buy. */
  const lpAmountEditedByUserRef = useRef(false);
  const markLpProgrammatic = useCallback(() => {
    lpAmountEditedByUserRef.current = false;
  }, []);

  const createOfferMutation = useCreateOffer();
  const { createOffer: tibetCreateOffer, isCreating: tibetSubmitting } =
    useTibetCreateOffer();

  const nativeTicker = getNativeTokenTickerForNetwork(network);
  const isTestnet = network === "testnet";

  const currentSell = (filters?.sellAsset ?? [])[0] ?? "";
  const currentBuy = (filters?.buyAsset ?? [])[0] ?? "";

  useSwapTabOrderPrefill({
    selectedOrderForTaking,
    currentSell,
    currentBuy,
    setLpAmount,
    setOfferedAmount,
    setRequestedAmount,
    setAmountDriver,
  });

  const { data: allPairs = [], isLoading: pairsLoading } = useTibetPairs({
    limit: 100,
  });

  useSwapTabPairFromFilters(filters, allPairs, selectedPair, setSelectedPair);

  const offeredTicker = (filters?.sellAsset ?? [])[0] ?? null;
  const requestedTicker = (filters?.buyAsset ?? [])[0] ?? null;
  const hasValidFilterPair =
    !!offeredTicker &&
    !!requestedTicker &&
    !!selectedPair &&
    (isXchTicker(offeredTicker) || isXchTicker(requestedTicker));

  const xchIsOffered = isXchTicker(offeredTicker);
  const {
    quote,
    modalPayAmount,
    priceLine,
    priceImpactPercent,
    liquidityFeePercent,
  } = useSwapQuoteSync({
    selectedPair,
    amountDriver,
    xchIsOffered,
    offeredAmount,
    requestedAmount,
    setOfferedAmount,
    setRequestedAmount,
    skipQuoteSync:
      lpAmount.trim() !== "" && lpAmountEditedByUserRef.current,
  });

  const removeReceive = useMemo(() => {
    if (!selectedPair) return null;
    const lp = parseFloat(lpAmount) || 0;
    return removeReceiveEstimate(selectedPair, lp);
  }, [selectedPair, lpAmount]);

  const { addLpReceive, amountsFromLpRef, lpJustSetFromAmountsRef } =
    useAddLpReceiveAndSync(
      selectedPair,
      offeredAmount,
      requestedAmount,
      xchIsOffered,
      setLpAmount,
      markLpProgrammatic,
    );

  useSwapTabLpRemoveAmountsSync({
    removeReceive,
    selectedPair,
    lpAmount,
    xchIsOffered,
    setOfferedAmount,
    setRequestedAmount,
    amountsFromLpRef,
    lpJustSetFromAmountsRef,
    lpEditedByUserRef: lpAmountEditedByUserRef,
  });

  const tokenName =
    selectedPair?.asset_short_name || selectedPair?.asset_name || "Token";

  const { handleAdd, handleRemove, isLiquidityPending } = useLiquidityHandlers({
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
    isTibetCreating: tibetSubmitting,
  });

  const isSwapPending = createOfferMutation.isPending || tibetSubmitting;

  const handleConfirmSwap = useSwapTabConfirmSwap({
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
  });

  const swapFormContent = (
    <SwapFormBody
      t={t}
      hasValidFilterPair={hasValidFilterPair}
      nativeTicker={nativeTicker}
      isTestnet={isTestnet}
      offeredTicker={offeredTicker}
      requestedTicker={requestedTicker}
      selectedPair={selectedPair}
      offeredAmount={offeredAmount}
      requestedAmount={requestedAmount}
      priceLine={priceLine}
      quote={quote}
      priceImpactPercent={priceImpactPercent}
      liquidityFeePercent={liquidityFeePercent}
      modalPayAmount={modalPayAmount}
      pairsLoading={pairsLoading}
      onOfferedChange={(v) => {
        lpAmountEditedByUserRef.current = false;
        setLpAmount("");
        setOfferedAmount(v);
      }}
      onRequestedChange={(v) => {
        lpAmountEditedByUserRef.current = false;
        setLpAmount("");
        setRequestedAmount(v);
      }}
      onAmountDriverOffered={() => setAmountDriver("offered")}
      onAmountDriverRequested={() => setAmountDriver("requested")}
      onSubmitSwap={handleConfirmSwap}
      isSwapPending={isSwapPending}
      lpAmount={lpAmount}
      onLpAmountChange={(v) => {
        lpAmountEditedByUserRef.current = true;
        setLpAmount(v);
      }}
      addLpReceive={addLpReceive}
      removeReceive={removeReceive}
      tokenName={tokenName}
      liquidityError={liquidityError}
      liquiditySuccess={liquiditySuccess}
      swapError={swapError}
      swapSuccess={swapSuccess}
      onRemove={handleRemove}
      onAdd={handleAdd}
      isLiquidityPending={isLiquidityPending}
    />
  );

  const unifiedForm = (
    <div className="flex flex-col gap-2">
      {hasValidFilterPair && swapFormContent}

      {!hasValidFilterPair && (
        <div
          className={`rounded-md p-2 text-center text-xs ${t.card} border ${t.border} ${t.textSecondary}`}
        >
          Select assets using the filter above (Sell and Buy) to set the pair
          and see swap, add, and remove.
        </div>
      )}
    </div>
  );

  if (mode === "inline") {
    return unifiedForm;
  }

  return (
    <div className="h-full flex flex-col">
      <div
        className={`flex-1 flex flex-col overflow-hidden rounded-xl ${t.card} border ${t.border}`}
      >
        <div className="flex-1 overflow-auto px-1.5 py-1">{unifiedForm}</div>
      </div>
    </div>
  );
}
