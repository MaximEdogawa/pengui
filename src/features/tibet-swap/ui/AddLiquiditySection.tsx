"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useThemeClasses } from "@/shared/hooks";
import { convertToSmallestUnit } from "@/shared/lib/utils/chia-units";
import { logger } from "@/shared/lib/logger";
import { PairSelector } from "./PairSelector";
import type { TibetApiPair } from "../lib/tibetTypes";
import { useTibetOffer } from "../hooks/useTibetOffer";

interface AddLiquiditySectionProps {
  pairs: TibetApiPair[];
  pairsLoading: boolean;
  /** When set (e.g. from Swap tab filter), use this pair and hide pair selector for unified view */
  selectedPairFromFilter?: TibetApiPair | null;
}

export function AddLiquiditySection({
  pairs,
  pairsLoading,
  selectedPairFromFilter,
}: AddLiquiditySectionProps) {
  const { t } = useThemeClasses();
  const [localPair, setLocalPair] = useState<TibetApiPair | null>(null);
  const selectedPair = selectedPairFromFilter ?? localPair;
  const [xchAmount, setXchAmount] = useState("");
  const [tokenAmount, setTokenAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const tibetOffer = useTibetOffer();

  const handleAdd = async () => {
    if (!selectedPair) return;
    const xch = parseFloat(xchAmount) || 0;
    const token = parseFloat(tokenAmount) || 0;
    if (xch <= 0 || token <= 0) {
      setError("Enter XCH and token amounts");
      return;
    }

    setError("");
    setSuccess(false);

    try {
      const xchMojos = Math.round(convertToSmallestUnit(xch, "xch"));
      const tokenSmallest = Math.round(convertToSmallestUnit(token, "cat"));
      const shareXch = xchMojos / selectedPair.xch_reserve;
      const shareToken = tokenSmallest / selectedPair.token_reserve;
      const share = Math.min(shareXch, shareToken);

      // Use floor to mirror the AMM formula — ensures requested LP never exceeds what's minted
      const xchMojosToOffer = Math.floor(share * selectedPair.xch_reserve);
      const tokenSmallestToOffer = Math.floor(share * selectedPair.token_reserve);
      const lpReceiveSmallest = Math.floor(
        Math.min(
          xchMojosToOffer / selectedPair.xch_reserve,
          tokenSmallestToOffer / selectedPair.token_reserve,
        ) * selectedPair.liquidity,
      );

      if (lpReceiveSmallest <= 0) {
        setError("Amounts too small, increase XCH or token input");
        return;
      }

      // Give XCH + token, receive LP tokens
      await tibetOffer.addLiquidity({
        pair: selectedPair,
        xchAmount: xchMojosToOffer,
        tokenAmount: tokenSmallestToOffer,
        lpAmount: lpReceiveSmallest,
      });

      setSuccess(true);
      setXchAmount("");
      setTokenAmount("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Add liquidity failed";
      logger.error("Add liquidity failed", e);
      setError(msg);
    }
  };

  return (
    <div
      className={`rounded-xl p-2.5 space-y-2 max-w-sm ${t.card} border ${t.border}`}
    >
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
        placeholder="XCH"
        aria-label="XCH amount"
        className={`w-full rounded-xl px-2.5 py-1.5 text-xs border ${t.input} ${t.text} placeholder:opacity-60 focus:outline-none focus:ring-2 ${t.focusRing}`}
        value={xchAmount}
        onChange={(e) => setXchAmount(e.target.value)}
      />
      <input
        type="text"
        inputMode="decimal"
        placeholder={selectedPair?.asset_short_name ?? "Token"}
        aria-label="Token amount"
        className={`w-full rounded-xl px-2.5 py-1.5 text-xs border ${t.input} ${t.text} placeholder:opacity-60 focus:outline-none focus:ring-2 ${t.focusRing}`}
        value={tokenAmount}
        onChange={(e) => setTokenAmount(e.target.value)}
      />
      {error && <p className="text-[10px] text-red-500">{error}</p>}
      {success && (
        <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
          Added.
        </p>
      )}
      <button
        type="button"
        onClick={handleAdd}
        disabled={!selectedPair || tibetOffer.isPending || pairsLoading}
        className={`w-full rounded-xl py-1.5 flex items-center justify-center gap-1.5 text-xs font-medium border ${t.border} disabled:opacity-40 disabled:pointer-events-none bg-gradient-to-r ${t.accent} text-white ${t.accentHover} transition-colors`}
      >
        <Plus size={14} />
        {tibetOffer.isPending ? "…" : "Add"}
      </button>
    </div>
  );
}
