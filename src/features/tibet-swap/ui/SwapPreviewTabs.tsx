"use client";

import { AlertTriangle } from "lucide-react";
import { useThemeClasses } from "@/shared/hooks";
import { TickerIcon, XchIcon } from "@/entities/asset";
import type { TibetApiPair } from "../lib/tibetTypes";

const DEV_FEE_PERCENT = 0.7;

type ThemeT = ReturnType<typeof useThemeClasses>["t"];

export function SwapPreviewTabContent({
  t,
  requestedTicker,
  requestedAmount,
  offeredTicker,
  offeredAmount,
  isRequestedNative,
  isOfferedNative,
  selectedPair,
  priceLine,
  isHighImpact,
  priceImpactPercent,
  confirmHighImpact,
  setConfirmHighImpact,
  liquidityFeePercent,
  nativeTicker,
  isTestnet,
}: {
  t: ThemeT;
  requestedTicker: string | null;
  requestedAmount: string;
  offeredTicker: string | null;
  offeredAmount: string;
  isRequestedNative: boolean;
  isOfferedNative: boolean;
  selectedPair: TibetApiPair | null;
  priceLine: string | null;
  isHighImpact: boolean;
  priceImpactPercent: number | null;
  confirmHighImpact: boolean;
  setConfirmHighImpact: (v: boolean) => void;
  liquidityFeePercent: string;
  nativeTicker: string;
  isTestnet: boolean;
}) {
  return (
    <div className="space-y-1 text-[11px]">
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
              <span>{requestedAmount || "—"} {requestedTicker}</span>
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
              <span>{offeredAmount || "—"} {offeredTicker}</span>
            </>
          )}
        </span>
      </div>
      <div className={`flex justify-between border-t ${t.border} pt-1 mt-1`}>
        <span className={t.textSecondary}>Price</span>
        <span className={`font-mono ${t.text}`}>{priceLine ?? "—"}</span>
      </div>
      {isHighImpact ? (
        <div className={`border-t ${t.border} pt-1 mt-1 rounded-md p-2 bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/30 space-y-1.5`}>
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
        <div className={`flex justify-between border-t ${t.border} pt-1 mt-1`}>
          <span className={t.textSecondary}>Price impact</span>
          <span className={`font-mono ${t.text}`}>
            {priceImpactPercent != null ? `${priceImpactPercent.toFixed(2)}%` : "—"}
          </span>
        </div>
      )}
      <div className={`flex justify-between border-t ${t.border} pt-1 mt-1`}>
        <span className={t.textSecondary}>Liquidity fee</span>
        <span className={t.text}>{liquidityFeePercent}%</span>
      </div>
      <div className={`flex justify-between border-t ${t.border} pt-1 mt-1`}>
        <span className={t.textSecondary}>Dev fee</span>
        <span className={t.text}>{DEV_FEE_PERCENT}%</span>
      </div>
    </div>
  );
}

export function RemovePreviewTabContent({
  t,
  removeReceive,
  nativeTicker,
  tokenName,
  selectedPair,
  isTestnet,
  lpAmount,
}: {
  t: ThemeT;
  removeReceive: { xch: number; token: number } | null;
  nativeTicker: string;
  tokenName: string;
  selectedPair: TibetApiPair | null;
  isTestnet: boolean;
  lpAmount: string;
}) {
  const hasReceive = removeReceive != null;
  const lpDisplay = lpAmount.trim() || "—";
  return (
    <div className="space-y-1 text-[11px]">
      <div className={t.textSecondary}>You will receive:</div>
      {hasReceive ? (
        <>
          <div className="flex justify-between items-start">
            <span className={t.textSecondary}>{nativeTicker}</span>
            <span className={`${t.text} inline-flex items-center gap-1 justify-end`}>
              <XchIcon size={14} isTestnet={isTestnet} />
              <span>~{removeReceive.xch.toFixed(6)} {nativeTicker}</span>
            </span>
          </div>
          <div className="flex justify-between items-start">
            <span className={t.textSecondary}>{tokenName}</span>
            <span className={`${t.text} inline-flex items-center gap-1 justify-end`}>
              {selectedPair && <TickerIcon assetId={selectedPair.asset_id} ticker={tokenName} size={14} />}
              <span>
                ~{removeReceive.token >= 1 ? removeReceive.token.toFixed(2) : removeReceive.token.toFixed(6)} {tokenName}
              </span>
            </span>
          </div>
        </>
      ) : (
        <p className={t.textSecondary}>
          Enter LP amount above, or both Offered and Requested (in pool ratio) to see estimate.
        </p>
      )}
      <div className={`border-t ${t.border} pt-1 mt-1`}>
        <div className={t.textSecondary}>You will pay:</div>
        <div className="flex justify-between items-start mt-0.5">
          <span className={t.textSecondary}>LP</span>
          <span className={t.text}>{lpDisplay} LP</span>
        </div>
      </div>
    </div>
  );
}

export function AddPreviewTabContent({
  t,
  offeredTicker,
  offeredAmount,
  requestedTicker,
  requestedAmount,
  isOfferedNative,
  isRequestedNative,
  selectedPair,
  isTestnet,
  lpReceive,
}: {
  t: ThemeT;
  offeredTicker: string | null;
  offeredAmount: string;
  requestedTicker: string | null;
  requestedAmount: string;
  isOfferedNative: boolean;
  isRequestedNative: boolean;
  selectedPair: TibetApiPair | null;
  isTestnet: boolean;
  lpReceive?: string;
}) {
  const lpDisplay = (lpReceive ?? "").trim() || "—";
  return (
    <div className="space-y-1 text-[11px]">
      <div className={t.textSecondary}>You will pay:</div>
      <div className="flex justify-between items-start">
        <span className={t.textSecondary}>{offeredTicker ?? "—"}</span>
        <span className={`${t.text} inline-flex items-center gap-1 justify-end`}>
          {offeredTicker && (
            <>
              {isOfferedNative ? <XchIcon size={14} isTestnet={isTestnet} /> : selectedPair ? <TickerIcon assetId={selectedPair.asset_id} ticker={offeredTicker ?? undefined} size={14} /> : null}
              <span>~{offeredAmount || "—"} {offeredTicker}</span>
            </>
          )}
        </span>
      </div>
      <div className="flex justify-between items-start">
        <span className={t.textSecondary}>{requestedTicker ?? "—"}</span>
        <span className={`${t.text} inline-flex items-center gap-1 justify-end`}>
          {requestedTicker && (
            <>
              {isRequestedNative ? <XchIcon size={14} isTestnet={isTestnet} /> : selectedPair ? <TickerIcon assetId={selectedPair.asset_id} ticker={requestedTicker ?? undefined} size={14} /> : null}
              <span>~{requestedAmount || "—"} {requestedTicker}</span>
            </>
          )}
        </span>
      </div>
      <div className={`border-t ${t.border} pt-1 mt-1`}>
        <div className={t.textSecondary}>Receive:</div>
        <div className="flex justify-between items-start mt-0.5">
          <span className={t.textSecondary}>LP</span>
          <span className={t.text}>{lpDisplay} LP</span>
        </div>
      </div>
    </div>
  );
}
