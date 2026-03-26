"use client";

import { useThemeClasses } from "@/shared/hooks";
import { useResponsive } from "@/shared/hooks/useResponsive";
import type { DexieOffer } from "@/entities/offer";
import { TickerIcon, XchIcon } from "@/entities/asset";
import { formatAmountForDisplay, formatPriceForDisplay } from "@/features/trading/lib/formatAmount";
import { TradeHistoryOfferItem } from "@/features/trading/hooks/useTradeHistory";

interface TradeHistoryRowProps {
  item: TradeHistoryOfferItem;
  onClick?: () => void;
}

function formatOfferDate(offer: DexieOffer): string {
  const d = offer.date_completed
    ? new Date(offer.date_completed)
    : offer.date_pending
      ? new Date(offer.date_pending)
      : new Date(offer.date_found);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${min}:${s}`;
}

function formatOfferDateShort(offer: DexieOffer): string {
  const d = offer.date_completed
    ? new Date(offer.date_completed)
    : offer.date_pending
      ? new Date(offer.date_pending)
      : new Date(offer.date_found);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${m}-${day} ${h}:${min}`;
}

function formatAssetAmount(
  amount: number | undefined | null,
  code: string,
  maxDecimals?: number
): string {
  if (amount == null || typeof amount !== "number" || Number.isNaN(amount)) return "—";
  return `${formatAmountForDisplay(amount, maxDecimals)} ${code || ""}`.trim();
}

const MOBILE_DECIMALS = 4;

export default function TradeHistoryRow({ item, onClick }: TradeHistoryRowProps) {
  const { t, isDark } = useThemeClasses();
  const { isMobile } = useResponsive();
  const maxDecimals = isMobile ? MOBILE_DECIMALS : undefined;
  const { offer, offerState, isMyOffer } = item;

  const requested = offer.requested?.[0];
  const offered = offer.offered?.[0];
  const price =
    offer.price ?? (offered?.amount && requested?.amount ? requested.amount / offered.amount : 0);

  const rowBgClass = isMyOffer
    ? isDark
      ? "bg-blue-500/5 hover:bg-blue-500/10"
      : "bg-blue-500/10 hover:bg-blue-500/15"
    : "hover:bg-white/5 dark:hover:bg-white/5";

  const mineTag = isMyOffer ? (
    <span
      className={`inline-flex items-center px-1 py-0.5 rounded text-[9px] sm:text-[10px] font-medium ${
        isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-500/25 text-blue-600"
      }`}
    >
      Mine
    </span>
  ) : null;

  return (
    <>
      {/* Mobile: compact card layout */}
      <div
        onClick={onClick}
        className={`sm:hidden px-2 py-1.5 border-b ${t.border} ${rowBgClass} transition-colors ${
          isMyOffer ? "border-l-2 border-l-blue-500/30" : ""
        } ${onClick ? "cursor-pointer" : ""}`}
      >
        {/* Row 1: Requested → Offered + Price */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="flex items-center gap-1 min-w-0 flex-1">
              {requested ? (
                <>
                  {requested.code === "XCH" || requested.code === "TXCH" ? (
                    <XchIcon size={14} className="flex-shrink-0" />
                  ) : (
                    <TickerIcon
                      assetId={requested.id}
                      ticker={requested.code ?? ""}
                      size={14}
                      className="flex-shrink-0"
                    />
                  )}
                  <span className={`text-[10px] font-mono ${t.text} truncate`}>
                    {formatAssetAmount(requested.amount, requested.code ?? "", maxDecimals)}
                  </span>
                </>
              ) : (
                <span className={`text-[10px] font-mono ${t.text} truncate`}>—</span>
              )}
            </div>
            <span className={`text-[9px] ${t.textSecondary} flex-shrink-0`}>→</span>
            <div className="flex items-center gap-1 min-w-0 flex-1 justify-end">
              {offered ? (
                <>
                  {offered.code === "XCH" || offered.code === "TXCH" ? (
                    <XchIcon size={14} className="flex-shrink-0" />
                  ) : (
                    <TickerIcon
                      assetId={offered.id}
                      ticker={offered.code ?? ""}
                      size={14}
                      className="flex-shrink-0"
                    />
                  )}
                  <span className={`text-[10px] font-mono ${t.text} truncate`}>
                    {formatAssetAmount(offered.amount, offered.code ?? "", maxDecimals)}
                  </span>
                </>
              ) : (
                <span className={`text-[10px] font-mono ${t.text} truncate`}>—</span>
              )}
            </div>
          </div>
          <span className={`text-[10px] font-mono ${t.text} flex-shrink-0 tabular-nums`}>
            {formatPriceForDisplay(price, maxDecimals)}
          </span>
        </div>
        {/* Row 2: Date + Status + Mine badge */}
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className={`text-[9px] ${t.textSecondary}`}>{formatOfferDateShort(offer)}</span>
          <div className="flex items-center gap-1">
            <span className={`text-[9px] ${t.textSecondary}`}>{offerState}</span>
            {mineTag}
          </div>
        </div>
      </div>

      {/* Desktop: grid table layout */}
      <div
        onClick={onClick}
        className={`hidden sm:grid grid-cols-8 gap-2 px-3 py-2 border-b ${t.border} ${rowBgClass} transition-colors ${
          isMyOffer ? "border-l-2 border-l-blue-500/30" : ""
        } ${onClick ? "cursor-pointer" : ""}`}
      >
        <div className="col-span-2 flex items-center gap-1 text-xs font-mono">
          {requested ? (
            <>
              {requested.code === "XCH" || requested.code === "TXCH" ? (
                <XchIcon size={16} className="flex-shrink-0" />
              ) : (
                <TickerIcon
                  assetId={requested.id}
                  ticker={requested.code ?? ""}
                  size={16}
                  className="flex-shrink-0"
                />
              )}
              <span className={`${t.text} truncate`}>
                {formatAssetAmount(requested.amount, requested.code ?? "", maxDecimals)}
              </span>
            </>
          ) : (
            <span className={`${t.text} truncate`}>—</span>
          )}
        </div>
        <div className="col-span-2 flex items-center gap-1 text-xs font-mono">
          {offered ? (
            <>
              {offered.code === "XCH" || offered.code === "TXCH" ? (
                <XchIcon size={16} className="flex-shrink-0" />
              ) : (
                <TickerIcon
                  assetId={offered.id}
                  ticker={offered.code ?? ""}
                  size={16}
                  className="flex-shrink-0"
                />
              )}
              <span className={`${t.text} truncate`}>
                {formatAssetAmount(offered.amount, offered.code ?? "", maxDecimals)}
              </span>
            </>
          ) : (
            <span className={`${t.text} truncate`}>—</span>
          )}
        </div>
        <div className={`text-xs font-mono ${t.text} truncate`}>
          {formatPriceForDisplay(price, maxDecimals)}
        </div>
        <div className={`text-xs ${t.text} col-span-2 truncate`}>{formatOfferDate(offer)}</div>
        <div className={`text-xs ${t.text} flex items-center gap-1.5 flex-wrap`}>
          <span>{offerState}</span>
          {mineTag}
        </div>
      </div>
    </>
  );
}
