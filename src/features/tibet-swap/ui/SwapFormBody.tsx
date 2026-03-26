"use client";

import { useState } from "react";
import { ArrowLeftRight, Plus, Minus } from "lucide-react";
import type { ThemeClasses } from "@/shared/lib/theme";
import { Button } from "@/shared/ui";
import type { TibetApiPair, TibetQuote } from "../lib/tibetTypes";
import { isXchTicker } from "../lib/tibetUiUtils";
import {
  SwapPreviewTabContent,
  RemovePreviewTabContent,
  AddPreviewTabContent,
} from "./SwapPreviewTabs";
import { SwapTradeCard } from "./SwapTradeCard";

export interface SwapFormBodyProps {
  t: ThemeClasses;
  hasValidFilterPair: boolean;
  nativeTicker: string;
  isTestnet: boolean;
  offeredTicker: string | null;
  requestedTicker: string | null;
  selectedPair: TibetApiPair | null;
  offeredAmount: string;
  requestedAmount: string;
  priceLine: string | null;
  quote: TibetQuote | null | undefined;
  priceImpactPercent: number | null;
  liquidityFeePercent: string;
  modalPayAmount: string;
  pairsLoading: boolean;
  onOfferedChange: (amount: string) => void;
  onRequestedChange: (amount: string) => void;
  onAmountDriverOffered: () => void;
  onAmountDriverRequested: () => void;
  onSubmitSwap: () => void;
  isSwapPending: boolean;
  lpAmount: string;
  onLpAmountChange: (v: string) => void;
  addLpReceive: string | undefined;
  removeReceive: { xch: number; token: number } | null;
  tokenName: string;
  liquidityError: string;
  liquiditySuccess: boolean;
  swapError: string;
  swapSuccess: boolean;
  onRemove: () => void;
  onAdd: () => void;
  isLiquidityPending: boolean;
  manualFeeXch: string;
  onManualFeeChange: (v: string) => void;
}

export function SwapFormBody({
  t,
  hasValidFilterPair,
  nativeTicker,
  isTestnet,
  offeredTicker,
  requestedTicker,
  selectedPair,
  offeredAmount,
  requestedAmount,
  priceLine,
  quote,
  priceImpactPercent,
  liquidityFeePercent,
  modalPayAmount,
  pairsLoading,
  onOfferedChange,
  onRequestedChange,
  onAmountDriverOffered,
  onAmountDriverRequested,
  onSubmitSwap,
  isSwapPending,
  lpAmount,
  onLpAmountChange,
  addLpReceive: addLpReceiveProp,
  removeReceive,
  tokenName,
  liquidityError,
  liquiditySuccess,
  swapError,
  swapSuccess,
  onRemove,
  onAdd,
  isLiquidityPending,
  manualFeeXch,
  onManualFeeChange,
}: SwapFormBodyProps) {
  const [previewTab, setPreviewTab] = useState<"swap" | "remove" | "add">(
    "swap",
  );

  const isOfferedNative = isXchTicker(offeredTicker);
  const isRequestedNative = isXchTicker(requestedTicker);

  if (!hasValidFilterPair) {
    return (
      <div className="space-y-1.5">
        <div
          className={`rounded-md p-2 text-center text-xs ${t.card} border ${t.border} ${t.textSecondary}`}
        >
          Select assets using the filter above (Sell and Buy) to set the swap
          pair.
        </div>
      </div>
    );
  }

  const previewContent =
    previewTab === "swap" ? (
      <SwapPreviewTabContent
        t={t}
        requestedTicker={requestedTicker}
        requestedAmount={requestedAmount}
        offeredTicker={offeredTicker}
        offeredAmount={offeredAmount}
        isRequestedNative={isRequestedNative}
        isOfferedNative={isOfferedNative}
        selectedPair={selectedPair}
        priceLine={priceLine}
        priceImpactPercent={priceImpactPercent}
        liquidityFeePercent={liquidityFeePercent}
        isTestnet={isTestnet}
      />
    ) : previewTab === "remove" ? (
      <RemovePreviewTabContent
        t={t}
        removeReceive={removeReceive}
        nativeTicker={nativeTicker}
        tokenName={tokenName}
        selectedPair={selectedPair}
        isTestnet={isTestnet}
        lpAmount={lpAmount}
      />
    ) : (
      <AddPreviewTabContent
        t={t}
        offeredTicker={offeredTicker}
        offeredAmount={offeredAmount}
        requestedTicker={requestedTicker}
        requestedAmount={requestedAmount}
        isOfferedNative={isOfferedNative}
        isRequestedNative={isRequestedNative}
        selectedPair={selectedPair}
        isTestnet={isTestnet}
        lpReceive={addLpReceiveProp}
      />
    );

  return (
    <div className="flex flex-col gap-2">
      <SwapTradeCard
        t={t}
        selectedPair={selectedPair}
        nativeTicker={nativeTicker}
        isTestnet={isTestnet}
        tokenName={tokenName}
        lpAmount={lpAmount}
        onLpAmountChange={onLpAmountChange}
        offeredTicker={offeredTicker}
        requestedTicker={requestedTicker}
        offeredAmount={offeredAmount}
        requestedAmount={requestedAmount}
        isOfferedNative={isOfferedNative}
        isRequestedNative={isRequestedNative}
        onOfferedChange={onOfferedChange}
        onRequestedChange={onRequestedChange}
        onAmountDriverOffered={onAmountDriverOffered}
        onAmountDriverRequested={onAmountDriverRequested}
      />

      {(liquidityError || swapError) && (
        <p className="px-0.5 text-xs" style={{ color: "var(--color-error)" }}>
          {swapError || liquidityError}
        </p>
      )}
      {(liquiditySuccess || swapSuccess) && (
        <p className="px-0.5 text-xs text-emerald-600 dark:text-emerald-400">
          Done.
        </p>
      )}

      <div className={`flex items-center gap-2 px-1 text-xs ${t.textSecondary}`}>
        <label htmlFor="manual-fee-input" className="shrink-0">
          Fee (XCH)
        </label>
        <input
          id="manual-fee-input"
          type="text"
          inputMode="decimal"
          placeholder="auto"
          aria-label="Manual blockchain fee in XCH"
          value={manualFeeXch}
          onChange={(e) => onManualFeeChange(e.target.value)}
          className={`w-28 rounded-lg px-2 py-0.5 text-xs border ${t.input} ${t.text} placeholder:opacity-50 focus:outline-none focus:ring-1 ${t.focusRing}`}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Button
          type="button"
          size="sm"
          className="w-full justify-center"
          onClick={onSubmitSwap}
          disabled={
            !selectedPair ||
            !modalPayAmount ||
            !quote ||
            pairsLoading ||
            isSwapPending
          }
          variant="info"
          icon={ArrowLeftRight}
        >
          {isSwapPending ? "Swapping…" : "Swap"}
        </Button>
        <div className="flex gap-1.5">
          <Button
            type="button"
            size="sm"
            className="flex-1 min-w-0 justify-center text-xs"
            onClick={onAdd}
            disabled={!selectedPair || isLiquidityPending || pairsLoading}
            variant="success"
            icon={Plus}
          >
            Add liquidity
          </Button>
          <Button
            type="button"
            size="sm"
            className="flex-1 min-w-0 justify-center text-xs"
            onClick={onRemove}
            disabled={!selectedPair || isLiquidityPending || pairsLoading}
            variant="danger"
            icon={Minus}
          >
            Remove
          </Button>
        </div>
      </div>

      <div
        className={`overflow-hidden rounded-md border ${t.border} ${t.card} backdrop-blur-xl`}
      >
        <div
          className="flex gap-0.5 bg-black/[0.02] p-0.5 dark:bg-white/[0.04]"
          role="tablist"
          aria-label="Quote preview"
        >
          {(["swap", "remove", "add"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={previewTab === tab}
              onClick={() => setPreviewTab(tab)}
              className={`flex-1 rounded px-1.5 py-1 text-[9px] font-medium transition-colors ${
                previewTab === tab
                  ? `${t.card} ${t.text} shadow-sm`
                  : `${t.textSecondary} ${t.cardHover}`
              }`}
            >
              {tab === "swap" ? "Quote" : tab === "remove" ? "Remove" : "Add"}
            </button>
          ))}
        </div>
        <div className={`border-t px-2 py-1.5 ${t.border}`}>{previewContent}</div>
      </div>
    </div>
  );
}
