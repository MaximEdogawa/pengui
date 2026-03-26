"use client";

import { useState } from "react";
import { Minus } from "lucide-react";
import { useThemeClasses } from "@/shared/hooks";
import { convertToSmallestUnit } from "@/shared/lib/utils/chia-units";
import { logger } from "@/shared/lib/logger";
import { PairSelector } from "./PairSelector";
import type { TibetApiPair } from "../lib/tibetTypes";
import { useTibetOffer } from "../hooks/useTibetOffer";

interface RemoveLiquiditySectionProps {
  pairs: TibetApiPair[];
  pairsLoading: boolean;
  /** When set (e.g. from Swap tab filter), use this pair and hide pair selector for unified view */
  selectedPairFromFilter?: TibetApiPair | null;
}

export function RemoveLiquiditySection({
  pairs,
  pairsLoading,
  selectedPairFromFilter,
}: RemoveLiquiditySectionProps) {
  const { t } = useThemeClasses();
  const [localPair, setLocalPair] = useState<TibetApiPair | null>(null);
  const selectedPair = selectedPairFromFilter ?? localPair;
  const [lpAmount, setLpAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const tibetOffer = useTibetOffer();

  const handleRemove = async () => {
    if (!selectedPair) return;
    const lp = parseFloat(lpAmount) || 0;
    if (lp <= 0) {
      setError("Enter LP amount to remove");
      return;
    }
    if (selectedPair.liquidity <= 0) {
      setError("Pool has no liquidity");
      return;
    }
    setError("");
    setSuccess(false);

    try {
      const lpSmallest = Math.round(convertToSmallestUnit(lp, "cat"));
      const removeShare = lpSmallest / selectedPair.liquidity;
      // Use floor so we never request more than the AMM formula yields
      const xchMojosExpected = Math.floor(selectedPair.xch_reserve * removeShare);
      const tokenSmallestExpected = Math.floor(selectedPair.token_reserve * removeShare);

      if (xchMojosExpected <= 0 || tokenSmallestExpected <= 0) {
        setError("LP amount too small to withdraw meaningful funds");
        return;
      }

      // Give LP tokens, receive XCH + token
      await tibetOffer.removeLiquidity({
        pair: selectedPair,
        lpAmount: lpSmallest,
        xchAmount: xchMojosExpected,
        tokenAmount: tokenSmallestExpected,
      });

      setSuccess(true);
      setLpAmount("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Remove liquidity failed";
      logger.error("Remove liquidity failed", e);
      setError(msg);
    }
  };

  return (
    <div className={`rounded-xl p-2.5 space-y-2 max-w-sm ${t.card} border ${t.border}`}>
      {selectedPairFromFilter == null && (
        <PairSelector
          pairs={pairs}
          value={localPair}
          onChange={setLocalPair}
          disabled={pairsLoading}
          placeholder="Select pair"
          variant="glass"
        />
      )}
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
        disabled={!selectedPair || tibetOffer.isPending || pairsLoading}
        className={`w-full rounded-xl py-1.5 flex items-center justify-center gap-1.5 text-xs font-medium border ${t.border} disabled:opacity-40 disabled:pointer-events-none bg-gradient-to-r ${t.accent} text-white ${t.accentHover} transition-colors`}
      >
        <Minus size={14} />
        {tibetOffer.isPending ? "…" : "Remove"}
      </button>
    </div>
  );
}
