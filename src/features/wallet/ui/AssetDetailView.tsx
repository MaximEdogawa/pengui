"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOrderBookFilterStore } from "@/features/trading/hooks/orderBookFilterStore";
import { useWalletBalance } from "../hooks/useWalletQueries";
import { useTransactionHistory } from "../hooks/useTransactionHistory";
import {
  getTransactionsByAsset,
  type StoredTransaction,
} from "@/shared/lib/walletConnect/utils/transactionStorage";
import { CHIA_ASSET_IDS, XCH_BASE_CURRENCIES } from "@/shared/lib/constants/chia-assets";
import TickerIcon, { XchIcon } from "@/entities/asset/ui/TickerIcon";
import { useCatTokens, type DexieTicker } from "@/entities/asset";
import { useNetwork } from "@/shared/hooks/useNetwork";
import { TibetLpPairIcon } from "@/features/tibet-swap/ui/TibetLpPairIcon";
import { useTibetLpPairMap } from "@/features/tibet-swap/hooks/useTibetLpPairMap";
import { getLpTicker } from "@/features/tibet-swap/lib/tibetUiUtils";
import { useThemeClasses, useWalletState } from "@/shared/hooks";
import { useResponsive } from "@/shared/hooks/useResponsive";
import { useNavigationProgress } from "@/shared/providers/NavigationProgressProvider";
import { useXchUsdPrice } from "@/shared/hooks/useXchUsdPrice";
import { formatRelativeTime } from "@/shared/lib/utils/dateUtils";
import { formatAmountFromMojos } from "@/shared/lib/utils/amountUtils";
import { convertFromSmallestUnit } from "@/shared/lib/utils/chia-units";
import Card from "./shared/Card";
import SectionHeader from "./shared/SectionHeader";
import EmptyState from "./shared/EmptyState";
import { Modal } from "@/shared/ui";
import SendTransactionForm from "./SendTransactionForm";
import AssetPriceChart from "./AssetPriceChart";
import { ReceiveModal } from "@/features/dashboard/ui/components/ReceiveModal";
import {
  ArrowLeft,
  Send,
  Download,
  TrendingUp,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const PAGE_SIZE = 20;

const DECIMALS_MOBILE = 4;

function formatBalance(balance: number, ticker: string, maxDecimals?: number): string {
  const dec = maxDecimals ?? 6;
  if (ticker === "XCH" || ticker === "TXCH") return balance.toFixed(Math.min(6, dec));
  if (balance >= 1e9) return balance.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (balance >= 1) return balance.toFixed(Math.min(2, dec));
  return balance.toFixed(Math.min(6, dec));
}

function formatUsd(value: number | null, maxDecimals?: number): string {
  if (value == null || value <= 0) return "—";
  const dec = maxDecimals ?? 2;
  return `$${value.toFixed(Math.min(2, dec))}`;
}

function formatPrice(value: number | null, maxDecimals?: number): string {
  if (value == null || value <= 0) return "—";
  const dec = maxDecimals ?? 4;
  if (value >= 1_000)
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: Math.min(2, dec) })}`;
  if (value >= 1) return `$${value.toFixed(Math.min(2, dec))}`;
  if (value >= 0.01) return `$${value.toFixed(Math.min(4, dec))}`;
  return `$${value.toPrecision(Math.min(3, dec + 1))}`;
}

interface AssetDetailViewProps {
  assetIdSlug: string;
}

export default function AssetDetailView({ assetIdSlug }: AssetDetailViewProps) {
  const router = useRouter();
  const { startNavigation } = useNavigationProgress();
  const { isDark, t } = useThemeClasses();
  const { isMobile } = useResponsive();
  const { network } = useNetwork();
  const maxDecimals = isMobile ? DECIMALS_MOBILE : undefined;
  const { priceUsd: xchUsdPrice } = useXchUsdPrice();
  const { getAsset, tickers } = useCatTokens();
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const { address } = useWalletState();
  const setTradingFilters = useOrderBookFilterStore((s) => s.setFilters);
  const clearTradingFilters = useOrderBookFilterStore((s) => s.clearAllFilters);

  const assetId = assetIdSlug === "xch" ? CHIA_ASSET_IDS.XCH : decodeURIComponent(assetIdSlug);
  const isXch = assetId === CHIA_ASSET_IDS.XCH || assetId === "";
  const lpMap = useTibetLpPairMap();
  const lpPair = !isXch ? lpMap.get(assetId) : undefined;
  const isLpToken = lpPair != null;

  // Single WalletConnect RPC for this specific asset's balance.
  const { data: balanceData, isLoading: isLoadingBalance } = useWalletBalance(
    isXch ? null : "cat",
    isXch ? null : assetId
  );

  const catalogAsset = !isXch ? getAsset(assetId) : undefined;
  const displayName = isXch
    ? "Chia"
    : isLpToken
      ? getLpTicker(lpPair)
      : (catalogAsset?.name ?? assetIdSlug.slice(0, 8));
  const ticker = isXch
    ? network === "testnet"
      ? "TXCH"
      : "XCH"
    : isLpToken
      ? getLpTicker(lpPair)
      : (catalogAsset?.ticker ?? assetIdSlug.slice(0, 8));

  const spendable = balanceData?.spendable != null ? Number(balanceData.spendable) : 0;
  const balance = convertFromSmallestUnit(spendable, isXch ? "xch" : "cat");

  const priceXch = isXch
    ? 1
    : (() => {
        const rawTickers = (tickers ?? []) as DexieTicker[];
        let best: number | null = null;
        let bestVol = -1;
        for (const t of rawTickers) {
          if (t.base_currency === assetId && XCH_BASE_CURRENCIES.has(t.target_currency)) {
            const price = Number(t.last_price);
            if (!price || isNaN(price)) continue;
            const vol = Number(t.target_volume) || 0;
            if (best == null || vol > bestVol) {
              best = price;
              bestVol = vol;
            }
          }
        }
        return best;
      })();

  const priceUsd = priceXch != null && xchUsdPrice != null ? priceXch * xchUsdPrice : null;
  const balanceUsd = priceUsd != null && balance > 0 ? balance * priceUsd : null;
  const availableBalance = balance;

  return (
    <div className="w-full relative z-10">
      <button
        type="button"
        onClick={() => {
          startNavigation();
          router.push("/wallet");
        }}
        className={`flex items-center gap-2 mb-4 py-1.5 ${t.textSecondary} hover:underline touch-manipulation text-sm sm:text-base`}
      >
        <ArrowLeft size={18} />
        Back to Wallet
      </button>

      <Card className="mb-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-3 min-w-0">
          {/* Icon + name + price */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
            <div className="flex-shrink-0">
              {isXch ? (
                <XchIcon size={36} isTestnet={network === "testnet"} />
              ) : isLpToken ? (
                <TibetLpPairIcon liquidityAssetId={assetId} size={36} />
              ) : (
                <TickerIcon assetId={assetId} ticker={ticker} size={36} />
              )}
            </div>
            <div className="min-w-0 overflow-hidden">
              <h1 className={`text-lg sm:text-base font-semibold ${t.text} leading-tight truncate`}>
                {displayName}
              </h1>
              <p className={`text-[13px] sm:text-[11px] leading-tight truncate`}>
                {isLpToken ? (
                  <span className="text-emerald-500/80 dark:text-emerald-400/70 font-medium">
                    TibetSwap
                  </span>
                ) : (
                  <span className={t.textSecondary}>
                    {ticker}
                    {priceUsd != null && priceUsd > 0 && (
                      <span className="ml-1">· {formatPrice(priceUsd, maxDecimals)}</span>
                    )}
                  </span>
                )}
              </p>
            </div>
          </div>
          {/* Action buttons */}
          <div className="flex items-center gap-1.5 sm:gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowSendModal(true)}
              className={`inline-flex items-center gap-1 px-3 py-2 sm:px-2.5 sm:py-1.5 rounded-lg text-xs sm:text-[11px] font-medium transition-colors touch-manipulation ${
                isDark
                  ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 active:bg-cyan-500/40"
                  : "bg-cyan-100 text-cyan-700 hover:bg-cyan-200 active:bg-cyan-300"
              }`}
            >
              <Send size={14} className="sm:w-3 sm:h-3" />
              <span className="hidden sm:inline">Send</span>
            </button>
            {address && (
              <button
                type="button"
                onClick={() => setShowReceiveModal(true)}
                className={`inline-flex items-center gap-1 px-3 py-2 sm:px-2.5 sm:py-1.5 rounded-lg text-xs sm:text-[11px] font-medium transition-colors touch-manipulation ${
                  isDark
                    ? "bg-white/10 text-gray-300 hover:bg-white/15 active:bg-white/20"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300 active:bg-gray-400"
                }`}
              >
                <Download size={14} className="sm:w-3 sm:h-3" />
                <span className="hidden sm:inline">Receive</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const nativeTicker = network === "testnet" ? "TXCH" : "XCH";
                clearTradingFilters();
                if (isXch) {
                  setTradingFilters({
                    buyAsset: [],
                    sellAsset: [nativeTicker],
                    status: [],
                    pagination: 50,
                  });
                } else {
                  setTradingFilters({
                    buyAsset: [ticker],
                    sellAsset: [nativeTicker],
                    status: [],
                    pagination: 50,
                  });
                }
                startNavigation();
                router.push("/trading");
              }}
              className={`inline-flex items-center gap-1 px-3 py-2 sm:px-2.5 sm:py-1.5 rounded-lg text-xs sm:text-[11px] font-medium transition-colors touch-manipulation ${
                isDark
                  ? "bg-white/10 text-gray-300 hover:bg-white/15 active:bg-white/20"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300 active:bg-gray-400"
              }`}
            >
              <TrendingUp size={14} className="sm:w-3 sm:h-3" />
              <span className="hidden sm:inline">Trade</span>
            </button>
          </div>
        </div>

        {/* Balance */}
        <div className="mb-3">
          {isLoadingBalance ? (
            <div className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-cyan-500 dark:border-gray-600 dark:border-t-cyan-400" />
              <span className={`${t.textSecondary} text-sm`}>Loading balance…</span>
            </div>
          ) : (
            <div className="flex items-baseline gap-2 flex-wrap min-w-0">
              <p
                className={`text-xl font-semibold ${t.text} tabular-nums break-all sm:break-normal`}
                title={`${formatBalance(balance, ticker)} ${ticker}`}
              >
                {formatBalance(balance, ticker, maxDecimals)} {ticker}
              </p>
              <p className={`text-sm ${t.textSecondary} tabular-nums flex-shrink-0`}>
                {formatUsd(balanceUsd, maxDecimals)}
              </p>
            </div>
          )}
        </div>

        {/* Chart */}
        <AssetPriceChart assetId={assetId} ticker={ticker} />
      </Card>

      {showSendModal && (
        <Modal onClose={() => setShowSendModal(false)} maxWidth="max-w-md">
          <div className="p-4">
            <h2 className={`text-lg font-semibold ${t.text} mb-3`}>Send {ticker}</h2>
            <SendTransactionForm
              availableBalance={availableBalance}
              assetId={isXch ? undefined : assetId}
              ticker={ticker}
              isXch={isXch}
            />
          </div>
        </Modal>
      )}

      {showReceiveModal && address && (
        <ReceiveModal
          address={address}
          isDark={isDark}
          t={t}
          onClose={() => setShowReceiveModal(false)}
        />
      )}

      <Card>
        <SectionHeader icon={History} title="Transaction History" />
        <AssetDetailTransactions assetId={assetId} assetSlug={assetIdSlug} />
      </Card>
    </div>
  );
}

function AssetDetailTransactions({ assetId, assetSlug }: { assetId: string; assetSlug: string }) {
  const { t } = useThemeClasses();
  const transactions = useTransactionHistory();
  const normalizedSlug = assetSlug === "xch" ? "xch" : assetId;
  const filtered = getTransactionsByAsset(transactions, normalizedSlug);
  const [page, setPage] = useState(1);
  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = filtered.length > paginated.length;

  if (filtered.length === 0) {
    return <EmptyState icon={History} message="No transactions for this asset yet." />;
  }

  return (
    <>
      <div className="space-y-2 mt-2">
        {paginated.map((tx) => (
          <TransactionRow key={tx.id} transaction={tx} />
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          className={`mt-3 w-full py-2 text-sm ${t.textSecondary} hover:underline`}
        >
          Load more
        </button>
      )}
    </>
  );
}

function TransactionRow({ transaction: tx }: { transaction: StoredTransaction }) {
  const { isDark, t } = useThemeClasses();
  const isSend = tx.type === "send";
  const assetLabel = tx.amountAsset ?? "XCH";

  const amountDisplay =
    assetLabel === "XCH" || assetLabel === "TXCH"
      ? formatAmountFromMojos(tx.amount)
      : convertFromSmallestUnit(Number(tx.amount), "cat").toString();

  return (
    <div
      className={`p-3 rounded-xl border transition-all ${
        isDark ? "bg-white/[0.03] border-white/5" : "bg-white/50 border-cyan-200/30"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className={`p-2 rounded-lg flex-shrink-0 ${
              isSend ? "bg-red-500/10" : "bg-emerald-500/10"
            }`}
          >
            {isSend ? (
              <ArrowUpRight className="text-red-400" size={16} />
            ) : (
              <ArrowDownLeft className="text-emerald-400" size={16} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`${t.text} text-sm font-medium`}>
              {isSend ? "Sent" : "Received"} {assetLabel}
            </p>
            <p className={`${t.textSecondary} text-xs`}>
              {formatRelativeTime(tx.timestamp)}
              {tx.usdValueAtTime != null && (
                <span className="ml-1"> · ${tx.usdValueAtTime.toFixed(2)}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {tx.status === "pending" && <Clock className="text-yellow-500" size={14} />}
          {tx.status === "confirmed" && <CheckCircle2 className="text-emerald-500" size={14} />}
          {tx.status === "failed" && <XCircle className="text-red-500" size={14} />}
          <p className={`text-sm font-semibold ${isSend ? "text-red-400" : "text-emerald-400"}`}>
            {isSend ? "-" : "+"}
            {amountDisplay} {assetLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
