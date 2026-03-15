"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/shared/ui";
import { X, AlertTriangle } from "lucide-react";
import { useThemeClasses } from "@/shared/hooks";
import { useNetwork } from "@/shared/hooks/useNetwork";
import { useTibetQuote, useTibetCreateOffer } from "../hooks";
import { useCreateOffer } from "@/features/wallet";
import { convertToSmallestUnit, mojosToXch } from "@/shared/lib/utils/chia-units";
import { CHIA_ASSET_IDS } from "@/shared/lib/constants/chia-assets";
import { logger } from "@/shared/lib/logger";
import { broadcastOfferToSplash } from "@/features/splash-terminal";
import type { TibetApiPair } from "../lib/tibetTypes";
import { computePriceImpactPercent } from "../lib/priceImpact";

const TOKEN_SMALLEST_PER_UNIT = 1000;

interface SwapModalProps {
  pair: TibetApiPair;
  amountInRaw: string;
  xchIsInput: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SwapModal({
  pair,
  amountInRaw,
  xchIsInput,
  onClose,
  onSuccess,
}: SwapModalProps) {
  const { t } = useThemeClasses();
  const { network } = useNetwork();
  const createOfferMutation = useCreateOffer();
  const { createOffer: tibetCreateOffer, isCreating: tibetSubmitting } =
    useTibetCreateOffer();

  const amountInNum = parseFloat(amountInRaw) || 0;
  const amountInMojos = xchIsInput
    ? Math.round(convertToSmallestUnit(amountInNum, "xch"))
    : 0;
  const amountInTokenSmallest = xchIsInput
    ? 0
    : Math.round(convertToSmallestUnit(amountInNum, "cat"));

  const amountIn = xchIsInput ? amountInMojos : amountInTokenSmallest;

  const quoteParams =
    amountIn > 0 && pair.pair_id
      ? {
          pair_id: pair.pair_id,
          amount_in: amountIn,
          xch_is_input: xchIsInput,
          estimate_fee: true,
        }
      : null;

  const { data: quote, isLoading: quoteLoading } = useTibetQuote(quoteParams);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [confirmHighImpact, setConfirmHighImpact] = useState(false);

  useEffect(() => {
    setError("");
  }, [amountInRaw, pair.pair_id, xchIsInput]);

  useEffect(() => {
    setConfirmHighImpact(false);
  }, [amountInRaw, pair.pair_id]);

  const handleConfirm = async () => {
    if (!quote || amountIn <= 0) return;
    setError("");

    try {
      const xchAssetId =
        network === "testnet" ? CHIA_ASSET_IDS.TXCH : CHIA_ASSET_IDS.XCH;

      const result = await createOfferMutation.mutateAsync({
        walletId: 1,
        offerAssets: xchIsInput
          ? [{ assetId: xchAssetId, amount: amountInMojos }]
          : [{ assetId: pair.asset_id, amount: amountInTokenSmallest }],
        requestAssets: xchIsInput
          ? [{ assetId: pair.asset_id, amount: quote.amount_out }]
          : [{ assetId: xchAssetId, amount: quote.amount_out }],
      });

      if (!result?.offer) {
        throw new Error("Wallet did not return a valid offer");
      }

      const tibetResult = await tibetCreateOffer({
        pair_id: pair.pair_id,
        offer: result.offer,
        action: "SWAP",
      });

      if (!tibetResult.success) {
        throw new Error(tibetResult.message || "Tibet swap failed");
      }

      try {
        void broadcastOfferToSplash(result.offer);
      } catch {
        // Fire-and-forget; do not fail the flow
      }

      setSuccess(true);
      setTimeout(() => onSuccess(), 1500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Swap failed";
      logger.error("Swap failed", e);
      setError(msg);
    }
  };

  const isPending = createOfferMutation.isPending || tibetSubmitting;
  const priceImpact = quote ? computePriceImpactPercent(quote) : null;

  return (
    <Modal onClose={onClose} maxWidth="max-w-md" closeOnOverlayClick>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-semibold ${t.text}`}>Confirm Swap</h2>
          <button
            onClick={onClose}
            className={`${t.textSecondary} ${t.cardHover} rounded-lg p-1`}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className={`rounded-xl border ${t.border} p-3 ${t.card}`}>
          <div className="flex justify-between text-sm">
            <span className={t.textSecondary}>You pay</span>
            <span className={t.text}>
              {amountInRaw || "0"} {xchIsInput ? "XCH" : pair.asset_short_name ?? pair.asset_name}
            </span>
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span className={t.textSecondary}>You receive</span>
            <span className={t.text}>
              {quoteLoading
                ? "..."
                : quote
                  ? xchIsInput
                    ? `${(quote.amount_out / TOKEN_SMALLEST_PER_UNIT).toLocaleString()} ${pair.asset_short_name ?? pair.asset_name}`
                    : `${mojosToXch(quote.amount_out).toFixed(6)} XCH`
                  : "—"}
            </span>
          </div>
          {quote && priceImpact != null && (
            priceImpact > 10 ? (
              <div className="mt-3 rounded-lg p-3 bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/30 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle size={12} className="flex-shrink-0" />
                    Price impact
                  </span>
                  <span className="font-mono text-xs font-semibold text-amber-700 dark:text-amber-400">
                    {priceImpact.toFixed(2)}%
                  </span>
                </div>
                <p className="text-xs leading-snug text-amber-700/90 dark:text-amber-400/90">
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
                  <span className="text-xs text-amber-700 dark:text-amber-400 group-hover:opacity-90">
                    I understand the high price impact and want to proceed
                  </span>
                </label>
              </div>
            ) : (
              <div className={`flex justify-between text-xs mt-2 ${t.textSecondary}`}>
                <span>Price impact</span>
                <span className={t.text}>{priceImpact.toFixed(2)}%</span>
              </div>
            )
          )}
        </div>

        {error && (
          <p className="mt-2 text-sm text-red-500 dark:text-red-400">{error}</p>
        )}

        {success && (
          <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">Swap submitted successfully.</p>
        )}

        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 py-2 rounded-xl border ${t.border} ${t.card} ${t.text} ${t.cardHover}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={
            !quote ||
            (priceImpact != null && priceImpact > 10 && !confirmHighImpact) ||
            isPending ||
            success
          }
            className={`flex-1 py-2 rounded-xl border ${t.border} bg-gradient-to-r ${t.accent} text-white ${t.accentHover} disabled:opacity-50 disabled:pointer-events-none transition-colors`}
          >
            {isPending ? "Submitting…" : success ? "Done" : "Confirm"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
