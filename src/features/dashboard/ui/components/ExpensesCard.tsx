"use client";

import { AppLink } from "@/shared/ui";
import {
  DollarSign,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Repeat,
} from "lucide-react";
import type { ThemeClasses } from "@/shared/lib/theme";
import { useTransactionHistory, useWalletAssets } from "@/features/wallet";
import { TickerIcon, XchIcon } from "@/entities/asset";
import { isChiaNativeToken } from "@/shared/lib/constants/chia-assets";
import { formatAmountFromMojos } from "@/shared/lib/utils/amountUtils";
import { convertFromSmallestUnit } from "@/shared/lib/utils/chia-units";
import type { StoredTransaction } from "@/shared/lib/walletConnect/utils/transactionStorage";
import { useMemo } from "react";
import { CardSkeleton } from "./CardSkeleton";
import { TibetLpPairIcon } from "@/features/tibet-swap/ui/TibetLpPairIcon";
import { useTibetLpPairMap } from "@/features/tibet-swap/hooks/useTibetLpPairMap";

interface ExpensesCardProps {
  isDark: boolean;
  t: ThemeClasses;
}

const MAX_VISIBLE_TRADES = 5;

function formatRelativeDate(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function txTypeLabel(type: StoredTransaction["type"]): string {
  const labels: Record<StoredTransaction["type"], string> = {
    send: "Send",
    receive: "Receive",
    trade: "Trade",
    swap: "Swap",
    loan: "Loan",
    options: "Options",
  };
  return labels[type] ?? type;
}

function TxIcon({ type, isDark }: { type: StoredTransaction["type"]; isDark: boolean }) {
  const size = 12;
  const stroke = 2;
  const incoming = type === "receive";
  const cls = incoming
    ? isDark
      ? "text-emerald-400"
      : "text-emerald-600"
    : isDark
      ? "text-rose-400"
      : "text-rose-600";

  switch (type) {
    case "swap":
      return (
        <ArrowRightLeft
          size={size}
          strokeWidth={stroke}
          className={isDark ? "text-blue-400" : "text-blue-600"}
        />
      );
    case "trade":
      return (
        <Repeat
          size={size}
          strokeWidth={stroke}
          className={isDark ? "text-violet-400" : "text-violet-600"}
        />
      );
    default:
      return incoming ? (
        <TrendingUp size={size} strokeWidth={stroke} className={cls} />
      ) : (
        <TrendingDown size={size} strokeWidth={stroke} className={cls} />
      );
  }
}

function formatTxAmount(tx: StoredTransaction): string {
  const asset = tx.amountAsset ?? "XCH";
  if (asset === "XCH" || asset === "TXCH") return formatAmountFromMojos(tx.amount);
  return convertFromSmallestUnit(Number(tx.amount), "cat").toString();
}

function computePnl(transactions: StoredTransaction[]): number {
  return transactions.reduce((sum, tx) => {
    const amt = Number(tx.usdValueAtTime ?? 0);
    if (tx.type === "receive") return sum + amt;
    if (tx.type === "send") return sum - amt;
    return sum;
  }, 0);
}

export function ExpensesCard({ isDark, t }: ExpensesCardProps) {
  const transactions = useTransactionHistory();
  const { isLoading } = useWalletAssets();
  const lpMap = useTibetLpPairMap();

  const recentTrades = useMemo(() => transactions.slice(0, MAX_VISIBLE_TRADES), [transactions]);

  const pnl = useMemo(() => computePnl(transactions), [transactions]);
  const pnlPositive = pnl >= 0;

  if (isLoading) {
    return <CardSkeleton isDark={isDark} t={t} lines={5} />;
  }

  const isEmpty = transactions.length === 0;

  return (
    <div
      className={`backdrop-blur-[40px] ${t.card} rounded-2xl p-3 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 flex flex-col ${
        isDark ? "bg-white/[0.03]" : "bg-white/30"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`p-2 rounded-xl backdrop-blur-sm ${
              isDark ? "bg-sky-500/10" : "bg-sky-500/20"
            }`}
          >
            <DollarSign
              className={isDark ? "text-sky-400" : "text-sky-600"}
              size={16}
              strokeWidth={2}
            />
          </div>
          <p className={`${t.textSecondary} text-[10px] font-medium uppercase tracking-wide`}>
            Expenses
          </p>
        </div>
        <AppLink
          href="/wallet"
          className={`flex items-center gap-1 text-[10px] font-medium ${t.textTertiary} hover:opacity-80 transition-opacity`}
        >
          View details <ArrowRight size={10} />
        </AppLink>
      </div>

      {/* P&L summary */}
      <div className="mb-2">
        <p
          className={`text-lg font-semibold tabular-nums ${
            pnlPositive
              ? isDark
                ? "text-emerald-400"
                : "text-emerald-600"
              : isDark
                ? "text-rose-400"
                : "text-rose-600"
          }`}
        >
          {pnlPositive ? "+" : "-"}$
          {Math.abs(pnl).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
        <p className={`${t.textTertiary} text-[10px] font-medium`}>Profit / Loss</p>
      </div>

      {isEmpty ? (
        <div className="flex-1 flex items-center justify-center py-4">
          <p className={`${t.textTertiary} text-xs`}>No recent transactions</p>
        </div>
      ) : (
        <div className="space-y-1 flex-1">
          {recentTrades.map((tx) => (
            <div
              key={tx.id}
              className={`flex items-center justify-between rounded-xl px-2.5 py-2 border transition-all duration-200 ${
                isDark
                  ? "bg-white/[0.03] border-white/5 hover:bg-white/[0.05]"
                  : "bg-white/50 border-cyan-200/30 hover:bg-white/70"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-1.5 rounded-lg backdrop-blur-sm flex items-center gap-1.5 ${
                    tx.type === "receive"
                      ? isDark
                        ? "bg-emerald-500/10"
                        : "bg-emerald-500/20"
                      : tx.type === "swap" || tx.type === "trade"
                        ? isDark
                          ? "bg-blue-500/10"
                          : "bg-blue-500/20"
                        : isDark
                          ? "bg-rose-500/10"
                          : "bg-rose-500/20"
                  }`}
                >
                  {!tx.assetId || isChiaNativeToken(tx.assetId) ? (
                    <XchIcon size={14} />
                  ) : lpMap.has(tx.assetId) ? (
                    <TibetLpPairIcon liquidityAssetId={tx.assetId} size={14} />
                  ) : (
                    <TickerIcon assetId={tx.assetId} ticker={tx.amountAsset ?? ""} size={14} />
                  )}
                  <TxIcon type={tx.type} isDark={isDark} />
                </div>
                <div>
                  <p className={`${t.text} font-medium text-[11px]`}>
                    {txTypeLabel(tx.type)}
                    {tx.amountAsset ? ` · ${tx.amountAsset}` : ""}
                  </p>
                  <p className={`${t.textTertiary} text-[10px] font-medium mt-0.5`}>
                    {formatRelativeDate(tx.timestamp)}
                  </p>
                </div>
              </div>
              <p
                className={`text-[11px] font-semibold tabular-nums ${
                  tx.type === "receive"
                    ? isDark
                      ? "text-emerald-400"
                      : "text-emerald-600"
                    : isDark
                      ? "text-rose-400"
                      : "text-rose-600"
                }`}
              >
                {tx.type === "receive" ? "+" : "-"}
                {formatTxAmount(tx)} {tx.amountAsset ?? "XCH"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
