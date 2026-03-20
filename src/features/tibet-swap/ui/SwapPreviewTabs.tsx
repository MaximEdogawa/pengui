"use client";

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
  priceImpactPercent,
  liquidityFeePercent,
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
  priceImpactPercent: number | null;
  liquidityFeePercent: string;
  isTestnet: boolean;
}) {
  return (
    <div className="space-y-1.5 text-[10px]">
      <div className="grid grid-cols-2 gap-1.5">
        <div className={`rounded-md border ${t.border} ${t.card} p-1.5`}>
          <div
            className={`text-[9px] font-medium uppercase tracking-wide ${t.textSecondary}`}
          >
            Receive
          </div>
          <div
            className={`mt-0.5 ${t.text} inline-flex flex-wrap items-center gap-0.5 font-medium`}
          >
            {requestedTicker && (
              <>
                {isRequestedNative ? (
                  <XchIcon size={12} isTestnet={isTestnet} />
                ) : selectedPair ? (
                  <TickerIcon
                    assetId={selectedPair.asset_id}
                    ticker={requestedTicker ?? undefined}
                    size={12}
                  />
                ) : null}
                <span className="font-mono tabular-nums">
                  {requestedAmount || "—"} {requestedTicker}
                </span>
              </>
            )}
          </div>
        </div>
        <div className={`rounded-md border ${t.border} ${t.card} p-1.5`}>
          <div
            className={`text-[9px] font-medium uppercase tracking-wide ${t.textSecondary}`}
          >
            Pay
          </div>
          <div
            className={`mt-0.5 ${t.text} inline-flex flex-wrap items-center gap-0.5`}
          >
            {offeredTicker && (
              <>
                {isOfferedNative ? (
                  <XchIcon size={12} isTestnet={isTestnet} />
                ) : selectedPair ? (
                  <TickerIcon
                    assetId={selectedPair.asset_id}
                    ticker={offeredTicker ?? undefined}
                    size={12}
                  />
                ) : null}
                <span className="font-mono tabular-nums">
                  {offeredAmount || "—"} {offeredTicker}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      <div
        className={`grid grid-cols-2 gap-x-2 gap-y-1 border-t ${t.border} pt-1.5`}
      >
        <span className={t.textSecondary}>Price</span>
        <span className={`font-mono text-right ${t.text}`}>
          {priceLine ?? "—"}
        </span>
        <span className={t.textSecondary}>Price impact</span>
        <span className={`font-mono text-right ${t.text}`}>
          {priceImpactPercent != null
            ? `${priceImpactPercent.toFixed(2)}%`
            : "—"}
        </span>
        <span className={t.textSecondary}>Liquidity fee</span>
        <span className="text-right">{liquidityFeePercent}%</span>
        <span className={t.textSecondary}>Dev fee</span>
        <span className="text-right">{DEV_FEE_PERCENT}%</span>
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
    <div className="space-y-1.5 text-[10px]">
      <div className={t.textSecondary}>You will receive:</div>
      {hasReceive ? (
        <>
          <div className="flex justify-between items-start">
            <span className={t.textSecondary}>{nativeTicker}</span>
            <span
              className={`${t.text} inline-flex items-center gap-1 justify-end`}
            >
              <XchIcon size={12} isTestnet={isTestnet} />
              <span>
                ~{removeReceive.xch.toFixed(6)} {nativeTicker}
              </span>
            </span>
          </div>
          <div className="flex justify-between items-start">
            <span className={t.textSecondary}>{tokenName}</span>
            <span
              className={`${t.text} inline-flex items-center gap-1 justify-end`}
            >
              {selectedPair && (
                <TickerIcon
                  assetId={selectedPair.asset_id}
                  ticker={tokenName}
                  size={12}
                />
              )}
              <span>
                ~
                {removeReceive.token >= 1
                  ? removeReceive.token.toFixed(2)
                  : removeReceive.token.toFixed(6)}{" "}
                {tokenName}
              </span>
            </span>
          </div>
        </>
      ) : (
        <p className={t.textSecondary}>
          Enter LP amount above, or both Sell and Buy amounts (in pool ratio) to
          see estimate.
        </p>
      )}
      <div className={`border-t ${t.border} pt-1.5 mt-1.5`}>
        <div className={t.textSecondary}>You will pay:</div>
        <div className="flex justify-between items-start mt-1">
          <span className={t.textSecondary}>LP Token</span>
          <span className={t.text}>{lpDisplay} LP Token</span>
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
    <div className="space-y-1.5 text-[10px]">
      <div className={t.textSecondary}>You will pay:</div>
      <div className="flex justify-between items-start">
        <span className={t.textSecondary}>{offeredTicker ?? "—"}</span>
        <span
          className={`${t.text} inline-flex items-center gap-1 justify-end`}
        >
          {offeredTicker && (
            <>
              {isOfferedNative ? (
                <XchIcon size={12} isTestnet={isTestnet} />
              ) : selectedPair ? (
                <TickerIcon
                  assetId={selectedPair.asset_id}
                  ticker={offeredTicker ?? undefined}
                  size={12}
                />
              ) : null}
              <span>
                ~{offeredAmount || "—"} {offeredTicker}
              </span>
            </>
          )}
        </span>
      </div>
      <div className="flex justify-between items-start">
        <span className={t.textSecondary}>{requestedTicker ?? "—"}</span>
        <span
          className={`${t.text} inline-flex items-center gap-1 justify-end`}
        >
          {requestedTicker && (
            <>
              {isRequestedNative ? (
                <XchIcon size={12} isTestnet={isTestnet} />
              ) : selectedPair ? (
                <TickerIcon
                  assetId={selectedPair.asset_id}
                  ticker={requestedTicker ?? undefined}
                  size={12}
                />
              ) : null}
              <span>
                ~{requestedAmount || "—"} {requestedTicker}
              </span>
            </>
          )}
        </span>
      </div>
      <div className={`border-t ${t.border} pt-1.5 mt-1.5`}>
        <div className={t.textSecondary}>Receive:</div>
        <div className="flex justify-between items-start mt-1">
          <span className={t.textSecondary}>LP</span>
          <span className={t.text}>{lpDisplay} LP</span>
        </div>
      </div>
    </div>
  );
}
