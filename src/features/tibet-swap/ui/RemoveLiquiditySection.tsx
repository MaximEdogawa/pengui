"use client";

import { useState } from "react";
import { Minus } from "lucide-react";
import { useThemeClasses } from "@/shared/hooks";
import { useNetwork } from "@/shared/hooks/useNetwork";
import { useTibetCreateOffer } from "../hooks";
import { useCreateOffer } from "@/features/wallet";
import { convertToSmallestUnit } from "@/shared/lib/utils/chia-units";
import { CHIA_ASSET_IDS } from "@/shared/lib/constants/chia-assets";
import { logger } from "@/shared/lib/logger";
import { PairSelector } from "./PairSelector";
import type { TibetApiPair } from "../lib/tibetTypes";

interface RemoveLiquiditySectionProps {
  pairs: TibetApiPair[];
  pairsLoading: boolean;
}

export function RemoveLiquiditySection({
  pairs,
  pairsLoading,
}: RemoveLiquiditySectionProps) {
  const { t } = useThemeClasses();
  const { network } = useNetwork();
  const [selectedPair, setSelectedPair] = useState<TibetApiPair | null>(null);
  const [lpAmount, setLpAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const createOfferMutation = useCreateOffer();
  const { createOffer: tibetCreateOffer, isCreating: tibetSubmitting } =
    useTibetCreateOffer();

  const handleRemove = async () => {
    if (!selectedPair) return;
    const lp = parseFloat(lpAmount) || 0;
    if (lp <= 0) {
      setError("Enter LP amount to remove");
      return;
    }
    setError("");
    setSuccess(false);

    try {
      const xchAssetId =
        network === "testnet" ? CHIA_ASSET_IDS.TXCH : CHIA_ASSET_IDS.XCH;
      const lpSmallest = Math.round(convertToSmallestUnit(lp, "cat"));

      const result = await createOfferMutation.mutateAsync({
        walletId: 1,
        offerAssets: [
          {
            assetId: selectedPair.liquidity_asset_id,
            amount: lpSmallest,
          },
        ],
        requestAssets: [
          { assetId: xchAssetId, amount: 1 },
          { assetId: selectedPair.asset_id, amount: 1 },
        ],
      });

      if (!result?.offer) {
        throw new Error("Wallet did not return a valid offer");
      }

      const tibetResult = await tibetCreateOffer({
        pair_id: selectedPair.pair_id,
        offer: result.offer,
        action: "REMOVE_LIQUIDITY",
      });

      if (!tibetResult.success) {
        throw new Error(tibetResult.message || "Remove liquidity failed");
      }

      setSuccess(true);
      setLpAmount("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Remove liquidity failed";
      logger.error("Remove liquidity failed", e);
      setError(msg);
    }
  };

  const isPending = createOfferMutation.isPending || tibetSubmitting;

  return (
    <div className={`rounded-xl p-2.5 space-y-2 max-w-sm ${t.card} border ${t.border}`}>
      <PairSelector
        pairs={pairs}
        value={selectedPair}
        onChange={setSelectedPair}
        disabled={pairsLoading}
        placeholder="Select pair"
        variant="glass"
      />
      <input
        type="text"
        inputMode="decimal"
        placeholder="LP"
        aria-label="LP amount to remove"
        className={`w-full rounded-xl px-2.5 py-1.5 text-xs border ${t.input} ${t.text} placeholder:opacity-60 focus:outline-none focus:ring-2 ${t.focusRing}`}
        value={lpAmount}
        onChange={(e) => setLpAmount(e.target.value)}
      />
      {error && <p className="text-[10px] text-red-500">{error}</p>}
      {success && <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Removed.</p>}
      <button
        type="button"
        onClick={handleRemove}
        disabled={!selectedPair || isPending || pairsLoading}
        className={`w-full rounded-xl py-1.5 flex items-center justify-center gap-1.5 text-xs font-medium border ${t.border} disabled:opacity-40 disabled:pointer-events-none bg-gradient-to-r ${t.accent} text-white ${t.accentHover} transition-colors`}
      >
        <Minus size={14} />
        {isPending ? "…" : "Remove"}
      </button>
    </div>
  );
}
