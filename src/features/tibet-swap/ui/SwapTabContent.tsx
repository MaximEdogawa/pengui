"use client";

import { useState, useMemo, useEffect } from "react";
import { ArrowLeftRight, Plus, Minus } from "lucide-react";
import { useThemeClasses } from "@/shared/hooks";
import { useNetwork } from "@/shared/hooks/useNetwork";
import { TickerIcon, XchIcon } from "@/entities/asset";
import { getNativeTokenTickerForNetwork } from "@/shared/lib/config/environment";
import { useTibetPairs, useTibetQuote, useTibetCreateOffer } from "../hooks";
import { useCreateOffer } from "@/features/wallet";
import { CHIA_ASSET_IDS } from "@/shared/lib/constants/chia-assets";
import { logger } from "@/shared/lib/logger";
import { useOrderBookFilters } from "@/features/trading/hooks/useOrderBookFilters";
import { useSelectedOrder } from "@/features/trading/hooks/SelectedOrderProvider";
import { SwapModal } from "./SwapModal";
import {
  SwapPreviewTabContent,
  RemovePreviewTabContent,
  AddPreviewTabContent,
} from "./SwapPreviewTabs";
import {
  convertToSmallestUnit,
  MOJOS_PER_XCH,
  mojosToXch,
} from "@/shared/lib/utils/chia-units";
import { AmountInput, Button } from "@/shared/ui";
import type { AssetType } from "@/entities/offer";
import type { TibetApiPair, TibetQuote } from "../lib/tibetTypes";
import { computePriceImpactPercent } from "../lib/priceImpact";

const TOKEN_SMALLEST_PER_UNIT = 1000;

function formatPrice(xchPerToken: number): string {
  if (xchPerToken >= 1) return xchPerToken.toFixed(4);
  if (xchPerToken >= 0.0001) return xchPerToken.toFixed(8);
  return xchPerToken.toExponential(4);
}

function isXchTicker(ticker: string | null): boolean {
  const c = (ticker ?? "").toLowerCase();
  return c === "xch" || c === "txch";
}

/** Estimate XCH and token received when removing lpAmount (display units) of LP from pair */
function removeReceiveEstimate(
  pair: TibetApiPair,
  lpDisplay: number,
): { xch: number; token: number } | null {
  if (lpDisplay <= 0 || pair.liquidity <= 0) return null;
  const lpSmallest = lpDisplay * TOKEN_SMALLEST_PER_UNIT;
  const share = lpSmallest / pair.liquidity;
  const xchMojos = pair.xch_reserve * share;
  const tokenSmallest = pair.token_reserve * share;
  return {
    xch: mojosToXch(Math.round(xchMojos)),
    token: Math.round(tokenSmallest) / TOKEN_SMALLEST_PER_UNIT,
  };
}

/** LP amount (smallest units) to remove to receive given XCH and token (display units); amounts must match pool ratio */
function lpToRemoveFromDesiredOutput(
  pair: TibetApiPair,
  xchDisplay: number,
  tokenDisplay: number,
): number | null {
  if (pair.liquidity <= 0 || pair.xch_reserve <= 0 || pair.token_reserve <= 0)
    return null;
  const xchMojos = Math.round(convertToSmallestUnit(xchDisplay, "xch"));
  const tokenSmallest = Math.round(convertToSmallestUnit(tokenDisplay, "cat"));
  if (xchMojos <= 0 && tokenSmallest <= 0) return null;
  const shareFromXch = xchMojos / pair.xch_reserve;
  const shareFromToken = tokenSmallest / pair.token_reserve;
  const share = Math.min(shareFromXch, shareFromToken);
  if (share <= 0) return null;
  return Math.floor(share * pair.liquidity);
}

interface SwapFormBodyProps {
  t: ReturnType<typeof useThemeClasses>["t"];
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
  onOpenSwapModal: () => void;
  lpAmount: string;
  onLpAmountChange: (v: string) => void;
  removeReceive: { xch: number; token: number } | null;
  tokenName: string;
  liquidityError: string;
  liquiditySuccess: boolean;
  onRemove: () => void;
  onAdd: () => void;
  isLiquidityPending: boolean;
}

function SwapFormBody({
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
  onOpenSwapModal,
  lpAmount,
  onLpAmountChange,
  removeReceive,
  tokenName,
  liquidityError,
  liquiditySuccess,
  onRemove,
  onAdd,
  isLiquidityPending,
}: SwapFormBodyProps) {
  const [confirmHighImpact, setConfirmHighImpact] = useState(false);
  const [previewTab, setPreviewTab] = useState<"swap" | "remove" | "add">(
    "swap",
  );
  const isHighImpact = priceImpactPercent != null && priceImpactPercent > 10;
  useEffect(() => {
    setConfirmHighImpact(false);
  }, [
    selectedPair?.pair_id,
    offeredAmount,
    requestedAmount,
    priceImpactPercent,
  ]);

  const isOfferedNative =
    offeredTicker?.toLowerCase() === nativeTicker.toLowerCase();
  const isRequestedNative =
    requestedTicker?.toLowerCase() === nativeTicker.toLowerCase();

  const addLpReceive = useMemo(() => {
    if (!selectedPair || selectedPair.liquidity <= 0 || selectedPair.xch_reserve <= 0 || selectedPair.token_reserve <= 0) return undefined;
    const offered = parseFloat(offeredAmount) || 0;
    const requested = parseFloat(requestedAmount) || 0;
    if (offered <= 0 || requested <= 0) return undefined;
    const xchMojos = isOfferedNative
      ? Math.round(convertToSmallestUnit(offered, "xch"))
      : Math.round(convertToSmallestUnit(requested, "xch"));
    const tokenSmallest = isOfferedNative
      ? Math.round(convertToSmallestUnit(requested, "cat"))
      : Math.round(convertToSmallestUnit(offered, "cat"));
    const shareXch = xchMojos / selectedPair.xch_reserve;
    const shareToken = tokenSmallest / selectedPair.token_reserve;
    const share = Math.min(shareXch, shareToken);
    const lpSmallest = Math.floor(share * selectedPair.liquidity);
    return (lpSmallest / TOKEN_SMALLEST_PER_UNIT).toFixed(6);
  }, [selectedPair, offeredAmount, requestedAmount, isOfferedNative]);

  if (!hasValidFilterPair) {
    return (
      <div className="space-y-3">
        <div
          className={`rounded-lg p-4 text-center text-sm ${t.card} border ${t.border} ${t.textSecondary}`}
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
        isHighImpact={isHighImpact}
        priceImpactPercent={priceImpactPercent}
        confirmHighImpact={confirmHighImpact}
        setConfirmHighImpact={setConfirmHighImpact}
        liquidityFeePercent={liquidityFeePercent}
        nativeTicker={nativeTicker}
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
        lpReceive={addLpReceive}
      />
    );

  return (
    <div className="space-y-3">
      <div>
        <label className={`block text-xs font-medium ${t.text} mb-1.5`}>
          Offered (you pay)
        </label>
        <div
          className={`flex items-center gap-2 w-full px-2 py-1.5 border rounded-lg text-xs ${t.input} ${t.border} backdrop-blur-xl ${t.card}`}
        >
          {isOfferedNative ? (
            <XchIcon size={14} isTestnet={isTestnet} />
          ) : selectedPair ? (
            <TickerIcon
              assetId={selectedPair.asset_id}
              ticker={offeredTicker ?? undefined}
              size={14}
            />
          ) : (
            <span
              className={`w-[14px] h-[14px] rounded-full ${t.card} border ${t.border}`}
            />
          )}
          <span className={`font-medium ${t.text} flex-shrink-0`}>
            {offeredTicker}
          </span>
          <div className="flex-1 min-w-0">
            <AmountInput
              value={parseFloat(offeredAmount) || 0}
              tempInput={offeredAmount}
              type={
                (offeredTicker && isXchTicker(offeredTicker)
                  ? "xch"
                  : "cat") as AssetType
              }
              onChange={(amount, temp) => {
                onAmountDriverOffered();
                onOfferedChange(temp !== undefined ? temp : String(amount));
              }}
              onBlur={() => {}}
            />
          </div>
        </div>
      </div>

      <div>
        <label className={`block text-xs font-medium ${t.text} mb-1.5`}>
          Requested (you receive)
        </label>
        <div
          className={`flex items-center gap-2 w-full px-2 py-1.5 border rounded-lg text-xs ${t.input} ${t.border} backdrop-blur-xl ${t.card}`}
        >
          {isRequestedNative ? (
            <XchIcon size={14} isTestnet={isTestnet} />
          ) : selectedPair ? (
            <TickerIcon
              assetId={selectedPair.asset_id}
              ticker={requestedTicker ?? undefined}
              size={14}
            />
          ) : (
            <span
              className={`w-[14px] h-[14px] rounded-full ${t.card} border ${t.border}`}
            />
          )}
          <span className={`font-medium ${t.text} flex-shrink-0`}>
            {requestedTicker}
          </span>
          <div className="flex-1 min-w-0">
            <AmountInput
              value={parseFloat(requestedAmount) || 0}
              tempInput={requestedAmount}
              type={
                (requestedTicker && isXchTicker(requestedTicker)
                  ? "xch"
                  : "cat") as AssetType
              }
              onChange={(amount, temp) => {
                onAmountDriverRequested();
                onRequestedChange(temp !== undefined ? temp : String(amount));
              }}
              onBlur={() => {}}
            />
          </div>
        </div>
      </div>

      <div>
        <label className={`block text-xs font-medium ${t.text} mb-1.5`}>
          LP token
        </label>
        <div
          className={`flex items-center gap-2 w-full px-2 py-1.5 border rounded-lg text-xs ${t.input} ${t.border} backdrop-blur-xl ${t.card}`}
        >
          {selectedPair && (
            <span className="relative inline-flex flex-shrink-0 w-[24px] h-[16px] items-center justify-center" title={`${tokenName} / XCH`}>
              <span className="absolute left-0 top-0 z-0">
                <XchIcon size={16} isTestnet={isTestnet} />
              </span>
              <span className="absolute left-2 top-0 z-10">
                <TickerIcon assetId={selectedPair.asset_id} ticker={tokenName} size={16} />
              </span>
            </span>
          )}
          <div className="flex-1 min-w-0">
            <AmountInput
              value={parseFloat(lpAmount) || 0}
              tempInput={lpAmount}
              type="cat"
              onChange={(amt, temp) =>
                onLpAmountChange(temp !== undefined ? temp : String(amt))
              }
              onBlur={() => {}}
            />
          </div>
        </div>
      </div>

      {liquidityError && (
        <p className="text-[10px]" style={{ color: "var(--color-error)" }}>
          {liquidityError}
        </p>
      )}
      {liquiditySuccess && (
        <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
          Done.
        </p>
      )}
      <div className="flex flex-wrap gap-2 justify-end">
        <Button
          type="button"
          onClick={onRemove}
          disabled={!selectedPair || isLiquidityPending || pairsLoading}
          variant="danger"
          icon={Minus}
        >
          Remove
        </Button>
        <Button
          type="button"
          onClick={onAdd}
          disabled={!selectedPair || isLiquidityPending || pairsLoading}
          variant="success"
          icon={Plus}
        >
          Add
        </Button>
        <Button
          type="button"
          onClick={onOpenSwapModal}
          disabled={
            (isHighImpact && !confirmHighImpact) ||
            !selectedPair ||
            !modalPayAmount ||
            !quote ||
            pairsLoading
          }
          variant="info"
          icon={ArrowLeftRight}
        >
          Swap
        </Button>
      </div>

      <div
        className={`rounded-lg border ${t.border} ${t.cardHover} overflow-hidden`}
      >
        <div
          className={`flex border-b ${t.border}`}
          role="tablist"
          aria-label="Preview type"
        >
          {(["swap", "remove", "add"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={previewTab === tab}
              onClick={() => setPreviewTab(tab)}
              className={`flex-1 px-2 py-1.5 text-[11px] font-medium transition-colors ${
                previewTab === tab
                  ? `${t.cardHover} ${t.text}`
                  : `${t.textSecondary} ${t.cardHover}`
              }`}
            >
              {tab === "swap" ? "Swap" : tab === "remove" ? "Remove" : "Add"}{" "}
              preview
            </button>
          ))}
        </div>
        <div className="p-3">{previewContent}</div>
      </div>
    </div>
  );
}

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

function useSwapQuoteSync({
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
  }, [quote, amountDriver, xchIsOffered, setOfferedAmount, setRequestedAmount, skipQuoteSync]);

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
      return `1 ${tokenName} = ${formatPrice(xchPerToken)} XCH`;
    }
    const tokenPerXch =
      quote.amount_out /
      MOJOS_PER_XCH /
      (quote.amount_in / TOKEN_SMALLEST_PER_UNIT);
    return `1 XCH = ${formatPrice(tokenPerXch)} ${tokenName}`;
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

interface UseLiquidityHandlersArgs {
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
  }) => Promise<{ success: boolean; message?: string }>;
  isTibetCreating: boolean;
}

function useLiquidityHandlers({
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
      setLiquidityError("Enter both amounts in Offered and Requested");
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
      const tibetResult = await tibetCreateOffer({
        pair_id: selectedPair.pair_id,
        offer: result.offer,
        action: "ADD_LIQUIDITY",
      });
      if (!tibetResult.success)
        throw new Error(tibetResult.message || "Add liquidity failed");
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
        setLiquidityError("Amounts should match pool ratio (use Offered and Requested)");
        return;
      }
      lpSmallest = computed;
    } else {
      const lp = parseFloat(lpAmount) || 0;
      if (lp <= 0) {
        setLiquidityError("Enter LP token amount or both Offered and Requested");
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
      const tibetResult = await tibetCreateOffer({
        pair_id: selectedPair.pair_id,
        offer: result.offer,
        action: "REMOVE_LIQUIDITY",
      });
      if (!tibetResult.success)
        throw new Error(tibetResult.message || "Remove liquidity failed");
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
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [lpAmount, setLpAmount] = useState("");
  const [liquidityError, setLiquidityError] = useState("");
  const [liquiditySuccess, setLiquiditySuccess] = useState(false);

  const createOfferMutation = useCreateOffer();
  const { createOffer: tibetCreateOffer, isCreating: tibetSubmitting } =
    useTibetCreateOffer();

  const nativeTicker = getNativeTokenTickerForNetwork(network);
  const isTestnet = network === "testnet";

  // Fill amount values from order book only; never change asset filters (sell/buy)
  const currentSell = (filters?.sellAsset ?? [])[0] ?? "";
  const currentBuy = (filters?.buyAsset ?? [])[0] ?? "";
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
  }, [selectedOrderForTaking, currentSell, currentBuy]);

  const { data: allPairs = [], isLoading: pairsLoading } = useTibetPairs({
    limit: 100,
  });

  // Pair is only set via the filter bar: when filter has one token + native, resolve the Tibet pair
  useEffect(() => {
    const buy = filters?.buyAsset ?? [];
    const sell = filters?.sellAsset ?? [];
    const allTickers = [...buy, ...sell];
    const native = nativeTicker.toLowerCase();
    const tokenTickers = allTickers.filter((tk) => tk.toLowerCase() !== native);
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
    nativeTicker,
    allPairs,
    selectedPair?.pair_id,
  ]);

  const offeredTicker = (filters?.sellAsset ?? [])[0] ?? null;
  const requestedTicker = (filters?.buyAsset ?? [])[0] ?? null;
  const hasValidFilterPair =
    !!offeredTicker &&
    !!requestedTicker &&
    !!selectedPair &&
    (offeredTicker.toLowerCase() === nativeTicker.toLowerCase() ||
      requestedTicker.toLowerCase() === nativeTicker.toLowerCase());

  const xchIsOffered =
    offeredTicker?.toLowerCase() === nativeTicker.toLowerCase();
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
    skipQuoteSync: lpAmount.trim() !== "",
  });

  const removeReceive = useMemo(() => {
    if (!selectedPair) return null;
    const lp = parseFloat(lpAmount) || 0;
    return removeReceiveEstimate(selectedPair, lp);
  }, [selectedPair, lpAmount]);

  useEffect(() => {
    if (!removeReceive || !selectedPair || lpAmount.trim() === "") return;
    const lpNum = parseFloat(lpAmount) || 0;
    if (lpNum <= 0) return;
    const xchStr = removeReceive.xch.toFixed(6);
    const tokenStr =
      removeReceive.token >= 1
        ? removeReceive.token.toFixed(2)
        : removeReceive.token.toFixed(6);
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
  ]);

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
      onOfferedChange={setOfferedAmount}
      onRequestedChange={setRequestedAmount}
      onAmountDriverOffered={() => setAmountDriver("offered")}
      onAmountDriverRequested={() => setAmountDriver("requested")}
      onOpenSwapModal={() =>
        selectedPair && modalPayAmount && quote && setShowSwapModal(true)
      }
      lpAmount={lpAmount}
      onLpAmountChange={setLpAmount}
      removeReceive={removeReceive}
      tokenName={tokenName}
      liquidityError={liquidityError}
      liquiditySuccess={liquiditySuccess}
      onRemove={handleRemove}
      onAdd={handleAdd}
      isLiquidityPending={isLiquidityPending}
    />
  );

  const modalFragment =
    showSwapModal && selectedPair ? (
      <SwapModal
        pair={selectedPair}
        amountInRaw={modalPayAmount}
        xchIsInput={xchIsOffered}
        onClose={() => setShowSwapModal(false)}
        onSuccess={() => {
          setShowSwapModal(false);
          setOfferedAmount("");
          setRequestedAmount("");
        }}
      />
    ) : null;

  const unifiedForm = (
    <div className="flex flex-col gap-4">
      {hasValidFilterPair && swapFormContent}

      {!hasValidFilterPair && (
        <div
          className={`rounded-lg p-4 text-center text-sm ${t.card} border ${t.border} ${t.textSecondary}`}
        >
          Select assets using the filter above (Sell and Buy) to set the pair
          and see swap, add, and remove.
        </div>
      )}
    </div>
  );

  if (mode === "inline") {
    return (
      <>
        {unifiedForm}
        {modalFragment}
      </>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div
        className={`flex-1 flex flex-col overflow-hidden rounded-xl ${t.card} border ${t.border}`}
      >
        <div className="flex-1 overflow-auto p-4">{unifiedForm}</div>
      </div>

      {modalFragment}
    </div>
  );
}
