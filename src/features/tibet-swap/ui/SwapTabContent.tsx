"use client";

import { useState, useMemo, useEffect } from "react";
import { ArrowLeftRight, Plus, Minus, AlertTriangle } from "lucide-react";
import { useThemeClasses } from "@/shared/hooks";
import { useNetwork } from "@/shared/hooks/useNetwork";
import { TickerIcon, XchIcon } from "@/entities/asset";
import { getNativeTokenTickerForNetwork } from "@/shared/lib/config/environment";
import { useTibetPairs, useTibetQuote } from "../hooks";
import { useOrderBookFilters } from "@/features/trading/hooks/useOrderBookFilters";
import { useSelectedOrder } from "@/features/trading/hooks/SelectedOrderProvider";
import { SwapModal } from "./SwapModal";
import { AddLiquiditySection } from "./AddLiquiditySection";
import { RemoveLiquiditySection } from "./RemoveLiquiditySection";
import {
  convertToSmallestUnit,
  MOJOS_PER_XCH,
  mojosToXch,
} from "@/shared/lib/utils/chia-units";
import { AmountInput, Button } from "@/shared/ui";
import type { AssetType } from "@/entities/offer";
import type { TibetApiPair, TibetQuote } from "../lib/tibetTypes";
import { computePriceImpactPercent } from "../lib/priceImpact";

type SwapSubTab = "swap" | "add" | "remove";

const DEV_FEE_PERCENT = 0.7;
const TOKEN_SMALLEST_PER_UNIT = 1000;

const subTabs: { id: SwapSubTab; icon: typeof ArrowLeftRight; title: string }[] = [
  { id: "swap", icon: ArrowLeftRight, title: "Swap" },
  { id: "add", icon: Plus, title: "Add liquidity" },
  { id: "remove", icon: Minus, title: "Remove liquidity" },
];

function formatPrice(xchPerToken: number): string {
  if (xchPerToken >= 1) return xchPerToken.toFixed(4);
  if (xchPerToken >= 0.0001) return xchPerToken.toFixed(8);
  return xchPerToken.toExponential(4);
}

function isXchTicker(ticker: string | null): boolean {
  const c = (ticker ?? "").toLowerCase();
  return c === "xch" || c === "txch";
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
}: SwapFormBodyProps) {
  const [confirmHighImpact, setConfirmHighImpact] = useState(false);
  const isHighImpact = priceImpactPercent != null && priceImpactPercent > 10;
  useEffect(() => {
    setConfirmHighImpact(false);
  }, [selectedPair?.pair_id, offeredAmount, requestedAmount, priceImpactPercent]);

  if (!hasValidFilterPair) {
    return (
      <div className="space-y-3">
        <div
          className={`rounded-lg p-4 text-center text-sm ${t.card} border ${t.border} ${t.textSecondary}`}
        >
          Select assets using the filter above (Sell and Buy) to set the swap pair.
        </div>
      </div>
    );
  }

  const isOfferedNative = offeredTicker?.toLowerCase() === nativeTicker.toLowerCase();
  const isRequestedNative = requestedTicker?.toLowerCase() === nativeTicker.toLowerCase();
  return (
    <div className="space-y-3">
      <div>
        <label className={`block text-xs font-medium ${t.text} mb-1.5`}>Offered (you pay)</label>
        <div
          className={`flex items-center gap-2 w-full px-2 py-1.5 border rounded-lg text-xs ${t.input} ${t.border} backdrop-blur-xl ${t.card}`}
        >
          {isOfferedNative ? (
            <XchIcon size={14} isTestnet={isTestnet} />
          ) : selectedPair ? (
            <TickerIcon assetId={selectedPair.asset_id} ticker={offeredTicker ?? undefined} size={14} />
          ) : (
            <span className={`w-[14px] h-[14px] rounded-full ${t.card} border ${t.border}`} />
          )}
          <span className={`font-medium ${t.text} flex-shrink-0`}>{offeredTicker}</span>
          <div className="flex-1 min-w-0">
            <AmountInput
              value={parseFloat(offeredAmount) || 0}
              tempInput={offeredAmount}
              type={(offeredTicker && isXchTicker(offeredTicker) ? "xch" : "cat") as AssetType}
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
        <label className={`block text-xs font-medium ${t.text} mb-1.5`}>Requested (you receive)</label>
        <div
          className={`flex items-center gap-2 w-full px-2 py-1.5 border rounded-lg text-xs ${t.input} ${t.border} backdrop-blur-xl ${t.card}`}
        >
          {isRequestedNative ? (
            <XchIcon size={14} isTestnet={isTestnet} />
          ) : selectedPair ? (
            <TickerIcon assetId={selectedPair.asset_id} ticker={requestedTicker ?? undefined} size={14} />
          ) : (
            <span className={`w-[14px] h-[14px] rounded-full ${t.card} border ${t.border}`} />
          )}
          <span className={`font-medium ${t.text} flex-shrink-0`}>{requestedTicker}</span>
          <div className="flex-1 min-w-0">
            <AmountInput
              value={parseFloat(requestedAmount) || 0}
              tempInput={requestedAmount}
              type={(requestedTicker && isXchTicker(requestedTicker) ? "xch" : "cat") as AssetType}
              onChange={(amount, temp) => {
                onAmountDriverRequested();
                onRequestedChange(temp !== undefined ? temp : String(amount));
              }}
              onBlur={() => {}}
            />
          </div>
        </div>
      </div>

      <div className={`p-3 rounded-lg ${t.cardHover} backdrop-blur-xl border ${t.border}`}>
        <h4 className={`text-xs font-medium ${t.text} mb-2`}>Swap Preview</h4>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between items-start">
            <span className={t.textSecondary}>You will receive:</span>
            <span className={`${t.text} inline-flex items-center gap-1 justify-end`}>
              {requestedTicker && (
                <>
                  {isRequestedNative ? (
                    <XchIcon size={14} isTestnet={isTestnet} />
                  ) : selectedPair ? (
                    <TickerIcon assetId={selectedPair.asset_id} ticker={requestedTicker ?? undefined} size={14} />
                  ) : null}
                  <span>
                    {requestedAmount || "—"} {requestedTicker}
                  </span>
                </>
              )}
            </span>
          </div>
          <div className="flex justify-between items-start">
            <span className={t.textSecondary}>You will pay:</span>
            <span className={`${t.text} inline-flex items-center gap-1 justify-end`}>
              {offeredTicker && (
                <>
                  {isOfferedNative ? (
                    <XchIcon size={14} isTestnet={isTestnet} />
                  ) : selectedPair ? (
                    <TickerIcon assetId={selectedPair.asset_id} ticker={offeredTicker ?? undefined} size={14} />
                  ) : null}
                  <span>
                    {offeredAmount || "—"} {offeredTicker}
                  </span>
                </>
              )}
            </span>
          </div>
          <div className={`flex justify-between border-t ${t.border} pt-1.5 mt-1.5`}>
            <span className={t.textSecondary}>Price</span>
            <span className={`font-mono ${t.text}`}>{priceLine ?? "—"}</span>
          </div>
          {isHighImpact ? (
            <div
              className={`border-t ${t.border} pt-1.5 mt-1.5 rounded-lg p-2.5 bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/30 space-y-2`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1.5">
                  <AlertTriangle size={12} className="flex-shrink-0" />
                  Price impact
                </span>
                <span className="font-mono text-xs font-semibold text-amber-700 dark:text-amber-400">
                  {priceImpactPercent != null ? `${priceImpactPercent.toFixed(2)}%` : "—"}
                </span>
              </div>
              <p className="text-[11px] leading-snug text-amber-700/90 dark:text-amber-400/90">
                High price impact. Consider splitting your trade or using a smaller amount.
              </p>
              <label className="flex items-start gap-2 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={confirmHighImpact}
                  onChange={(e) => setConfirmHighImpact(e.target.checked)}
                  className="mt-0.5 rounded border-amber-500 text-amber-500 focus:ring-amber-500/50 flex-shrink-0"
                  aria-label="Confirm you accept the high price impact"
                />
                <span className="text-[11px] text-amber-700 dark:text-amber-400 group-hover:opacity-90">
                  I understand the high price impact and want to swap
                </span>
              </label>
            </div>
          ) : (
            <div className={`flex justify-between border-t ${t.border} pt-1.5 mt-1.5`}>
              <span className={t.textSecondary}>Price impact</span>
              <span className={`font-mono ${t.text}`}>
                {priceImpactPercent != null ? `${priceImpactPercent.toFixed(2)}%` : "—"}
              </span>
            </div>
          )}
          <div className={`flex justify-between border-t ${t.border} pt-1.5 mt-1.5`}>
            <span className={t.textSecondary}>Liquidity fee</span>
            <span className={t.text}>{liquidityFeePercent}%</span>
          </div>
          <div className={`flex justify-between border-t ${t.border} pt-1.5 mt-1.5`}>
            <span className={t.textSecondary}>Dev fee</span>
            <span className={t.text}>{DEV_FEE_PERCENT}%</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
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
          variant="success"
          icon={ArrowLeftRight}
        >
          Swap
        </Button>
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
}

function useSwapQuoteSync({
  selectedPair,
  amountDriver,
  xchIsOffered,
  offeredAmount,
  requestedAmount,
  setOfferedAmount,
  setRequestedAmount,
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
    if (!quote) return;
    if (amountDriver === "offered" && quote.amount_out > 0) {
      if (xchIsOffered) {
        const tokenUnits = quote.amount_out / TOKEN_SMALLEST_PER_UNIT;
        setRequestedAmount(tokenUnits >= 1 ? tokenUnits.toFixed(4) : tokenUnits.toFixed(6));
      } else {
        setRequestedAmount(mojosToXch(quote.amount_out).toFixed(6));
      }
    }
    if (amountDriver === "requested" && quote.amount_in > 0) {
      if (xchIsOffered) {
        setOfferedAmount(mojosToXch(quote.amount_in).toFixed(6));
      } else {
        const tokenUnits = quote.amount_in / TOKEN_SMALLEST_PER_UNIT;
        setOfferedAmount(tokenUnits >= 1 ? tokenUnits.toFixed(4) : tokenUnits.toFixed(6));
      }
    }
  }, [quote, amountDriver, xchIsOffered, setOfferedAmount, setRequestedAmount]);

  const modalPayAmount =
    amountDriver === "offered"
      ? offeredAmount
      : quote && quote.amount_in > 0
        ? xchIsOffered
          ? mojosToXch(quote.amount_in).toFixed(6)
          : (quote.amount_in / TOKEN_SMALLEST_PER_UNIT >= 1
              ? (quote.amount_in / TOKEN_SMALLEST_PER_UNIT).toFixed(4)
              : (quote.amount_in / TOKEN_SMALLEST_PER_UNIT).toFixed(6))
        : "";

  const priceLine = useMemo(() => {
    if (!selectedPair || !quote || quote.amount_out <= 0) return null;
    const tokenName = selectedPair.asset_short_name || selectedPair.asset_name;
    if (xchIsOffered) {
      const xchPerToken =
        (quote.amount_in / MOJOS_PER_XCH) /
        (quote.amount_out / TOKEN_SMALLEST_PER_UNIT);
      return `1 ${tokenName} = ${formatPrice(xchPerToken)} XCH`;
    }
    const tokenPerXch =
      (quote.amount_out / MOJOS_PER_XCH) /
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

interface SwapTabContentProps {
  /** When true, render only the swap form (no sub-tabs, no extra card) to match Limit/Market layout */
  mode?: "inline";
}

export function SwapTabContent({ mode }: SwapTabContentProps = {}) {
  const { t } = useThemeClasses();
  const { network } = useNetwork();
  const { filters } = useOrderBookFilters();
  const { selectedOrderForTaking } = useSelectedOrder();
  const [subTab, setSubTab] = useState<SwapSubTab>("swap");
  const [selectedPair, setSelectedPair] = useState<TibetApiPair | null>(null);
  const [offeredAmount, setOfferedAmount] = useState("");
  const [requestedAmount, setRequestedAmount] = useState("");
  const [amountDriver, setAmountDriver] = useState<"offered" | "requested">("offered");
  const [showSwapModal, setShowSwapModal] = useState(false);

  const nativeTicker = getNativeTokenTickerForNetwork(network);
  const isTestnet = network === "testnet";

  // Fill amount values from order book only; never change asset filters (sell/buy)
  const currentSell = (filters?.sellAsset ?? [])[0] ?? "";
  const currentBuy = (filters?.buyAsset ?? [])[0] ?? "";
  useEffect(() => {
    const order = selectedOrderForTaking;
    if (!order?.id || !order.requesting?.length || !order.offering?.length) return;
    if (!currentSell || !currentBuy) return;
    const req = order.requesting[0];
    const off = order.offering[0];
    const reqTicker = ((req.code ?? req.id) || "").toLowerCase();
    const offTicker = ((off.code ?? off.id) || "").toLowerCase();
    if (!reqTicker || !offTicker) return;

    const orderSet = new Set([reqTicker, offTicker]);
    const filterSet = new Set([currentSell.toLowerCase(), currentBuy.toLowerCase()]);
    if (orderSet.size !== 2 || filterSet.size !== 2 || ![...orderSet].every((a) => filterSet.has(a))) return;

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

  const filteredPairs = useMemo(() => {
    const buy = (filters?.buyAsset ?? []).map((s) => s.toLowerCase());
    const sell = (filters?.sellAsset ?? []).map((s) => s.toLowerCase());
    const combined = [...new Set([...buy, ...sell])];
    if (combined.length === 0) return allPairs;
    return allPairs.filter((p) => {
      const token = (p.asset_short_name || p.asset_name || "").toLowerCase();
      return combined.some((f) => token.includes(f) || f.includes(token));
    });
  }, [allPairs, filters?.buyAsset, filters?.sellAsset]);

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
    if (match && selectedPair?.pair_id !== match.pair_id) setSelectedPair(match);
    if (!match) setSelectedPair(null);
  }, [filters?.buyAsset, filters?.sellAsset, nativeTicker, allPairs, selectedPair?.pair_id]);

  const offeredTicker = (filters?.sellAsset ?? [])[0] ?? null;
  const requestedTicker = (filters?.buyAsset ?? [])[0] ?? null;
  const hasValidFilterPair =
    !!offeredTicker &&
    !!requestedTicker &&
    !!selectedPair &&
    (offeredTicker.toLowerCase() === nativeTicker.toLowerCase() ||
      requestedTicker.toLowerCase() === nativeTicker.toLowerCase());

  const xchIsOffered = offeredTicker?.toLowerCase() === nativeTicker.toLowerCase();
  const { quote, modalPayAmount, priceLine, priceImpactPercent, liquidityFeePercent } =
    useSwapQuoteSync({
    selectedPair,
    amountDriver,
    xchIsOffered,
    offeredAmount,
    requestedAmount,
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
      onOfferedChange={setOfferedAmount}
      onRequestedChange={setRequestedAmount}
      onAmountDriverOffered={() => setAmountDriver("offered")}
      onAmountDriverRequested={() => setAmountDriver("requested")}
      onOpenSwapModal={() =>
        selectedPair && modalPayAmount && quote && setShowSwapModal(true)
      }
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

  if (mode === "inline") {
    return (
      <>
        {swapFormContent}
        {modalFragment}
      </>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div
        className={`flex-1 flex flex-col overflow-hidden rounded-xl ${t.card} border ${t.border}`}
      >
        <div className={`px-2 py-1.5 sm:py-2 border-b ${t.border} flex items-center gap-2 ${t.card}`}>
          <div
            className={`flex gap-0.5 p-0.5 rounded-xl ${t.card} border ${t.border} w-fit`}
            role="tablist"
          >
            {subTabs.map(({ id, icon: Icon, title }) => (
              <button
                key={id}
                type="button"
                onClick={() => setSubTab(id)}
                title={title}
                aria-label={title}
                role="tab"
                aria-selected={subTab === id}
                className={`p-1.5 rounded-lg transition-all duration-200 ${
                  subTab === id ? `${t.cardHover} ${t.text}` : `${t.textSecondary} ${t.cardHover}`
                }`}
              >
                <Icon size={16} strokeWidth={2.25} />
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {subTab === "swap" && swapFormContent}

          {subTab === "add" && (
            <AddLiquiditySection
              pairs={filteredPairs.length > 0 ? filteredPairs : allPairs}
              pairsLoading={pairsLoading}
            />
          )}

          {subTab === "remove" && (
            <RemoveLiquiditySection
              pairs={filteredPairs.length > 0 ? filteredPairs : allPairs}
              pairsLoading={pairsLoading}
            />
          )}
        </div>
      </div>

      {modalFragment}
    </div>
  );
}
