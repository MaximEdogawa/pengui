"use client";

import type { ThemeClasses } from "@/shared/lib/theme";
import { TickerIcon, XchIcon } from "@/entities/asset";
import { AmountInput } from "@/shared/ui";
import { AssetPairIcon } from "@/shared/ui/icons/AssetPairIcon";
import type { AssetType } from "@/entities/offer";
import type { TibetApiPair } from "../lib/tibetTypes";
import { isXchTicker } from "../lib/tibetUiUtils";

export interface SwapTradeCardProps {
  t: ThemeClasses;
  selectedPair: TibetApiPair | null;
  nativeTicker: string;
  isTestnet: boolean;
  tokenName: string;
  lpAmount: string;
  onLpAmountChange: (v: string) => void;
  offeredTicker: string | null;
  requestedTicker: string | null;
  offeredAmount: string;
  requestedAmount: string;
  isOfferedNative: boolean;
  isRequestedNative: boolean;
  onOfferedChange: (amount: string) => void;
  onRequestedChange: (amount: string) => void;
  onAmountDriverOffered: () => void;
  onAmountDriverRequested: () => void;
}

export function SwapTradeCard({
  t,
  selectedPair,
  nativeTicker,
  isTestnet,
  tokenName,
  lpAmount,
  onLpAmountChange,
  offeredTicker,
  requestedTicker,
  offeredAmount,
  requestedAmount,
  isOfferedNative,
  isRequestedNative,
  onOfferedChange,
  onRequestedChange,
  onAmountDriverOffered,
  onAmountDriverRequested,
}: SwapTradeCardProps) {
  const assetRow = `flex items-center gap-1.5 rounded-md border px-1.5 py-1 ${t.input} ${t.border} backdrop-blur-xl`;
  const amountField =
    "min-w-0 flex-1 [&_input]:!h-7 [&_input]:!min-h-[1.75rem] [&_input]:!px-1.5 [&_input]:!text-xs [&_input]:!font-medium [&_input]:!rounded-md";
  /** Same structure as buy/sell, scaled down (tighter row + shorter input). */
  const lpAssetRow = `flex items-center gap-1 rounded-md border px-1 py-0.5 ${t.input} ${t.border} backdrop-blur-xl`;
  const lpAmountField =
    "min-w-0 flex-1 [&_input]:!h-6 [&_input]:!min-h-[1.5rem] [&_input]:!px-1 [&_input]:!text-[10px] [&_input]:!font-medium [&_input]:!rounded-md";

  return (
    <div className={`overflow-hidden rounded-md border ${t.border} ${t.card} backdrop-blur-xl`}>
      <div className="px-1.5 py-1">
        <div className="mb-0.5">
          <span className={`text-[10px] font-medium leading-tight ${t.textSecondary}`}>
            LP token
          </span>
        </div>
        <div
          className={lpAssetRow}
          title={`${tokenName} / ${nativeTicker} — set amount to remove LP`}
        >
          {selectedPair ? (
            <AssetPairIcon
              back={<XchIcon size={12} isTestnet={isTestnet} />}
              front={<TickerIcon assetId={selectedPair.asset_id} ticker={tokenName} size={12} />}
            />
          ) : (
            <span className={`h-3 w-3 shrink-0 rounded-full ${t.card} border ${t.border}`} />
          )}
          <span className={`min-w-[1.75rem] shrink-0 text-[10px] font-medium ${t.text}`}>LP</span>
          <div className={lpAmountField}>
            <AmountInput
              value={parseFloat(lpAmount) || 0}
              tempInput={lpAmount}
              type="cat"
              onChange={(amt, temp) => onLpAmountChange(temp !== undefined ? temp : String(amt))}
              onBlur={() => {}}
            />
          </div>
        </div>
      </div>

      <div className={`border-t px-1.5 py-1.5 ${t.border}`}>
        <label className="mb-1 flex items-baseline justify-between gap-2">
          <span className={`text-[11px] font-semibold leading-tight ${t.text}`}>
            Buy {requestedTicker ?? "—"}
          </span>
          <span className={`text-[9px] ${t.textSecondary}`}>You receive</span>
        </label>
        <div className={`${assetRow} ring-1 ring-cyan-500/15 dark:ring-cyan-400/12`}>
          {isRequestedNative ? (
            <XchIcon size={14} isTestnet={isTestnet} />
          ) : selectedPair ? (
            <TickerIcon
              assetId={selectedPair.asset_id}
              ticker={requestedTicker ?? undefined}
              size={14}
            />
          ) : (
            <span className={`h-3.5 w-3.5 rounded-full ${t.card} border ${t.border}`} />
          )}
          <span className={`min-w-[2.25rem] shrink-0 text-[11px] font-medium ${t.text}`}>
            {requestedTicker}
          </span>
          <div className={amountField}>
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

      <div className={`border-t px-1.5 py-1.5 ${t.border}`}>
        <label className="mb-1 flex items-baseline justify-between gap-2">
          <span className={`text-[11px] font-medium leading-tight ${t.textSecondary}`}>
            Sell {offeredTicker ?? "—"}
          </span>
          <span className={`text-[9px] ${t.textSecondary}`}>You pay</span>
        </label>
        <div className={assetRow}>
          {isOfferedNative ? (
            <XchIcon size={14} isTestnet={isTestnet} />
          ) : selectedPair ? (
            <TickerIcon
              assetId={selectedPair.asset_id}
              ticker={offeredTicker ?? undefined}
              size={14}
            />
          ) : (
            <span className={`h-3.5 w-3.5 rounded-full ${t.card} border ${t.border}`} />
          )}
          <span className={`min-w-[2.25rem] shrink-0 text-[11px] font-medium ${t.text}`}>
            {offeredTicker}
          </span>
          <div className={amountField}>
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
    </div>
  );
}
