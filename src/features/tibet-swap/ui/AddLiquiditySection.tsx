"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useThemeClasses } from "@/shared/hooks";
import { useNetwork } from "@/shared/hooks/useNetwork";
import { useTibetCreateOffer } from "../hooks";
import { useCreateOffer } from "@/features/wallet";
import { convertToSmallestUnit } from "@/shared/lib/utils/chia-units";
import { CHIA_ASSET_IDS } from "@/shared/lib/constants/chia-assets";
import { logger } from "@/shared/lib/logger";
import { PairSelector } from "./PairSelector";
import type { TibetApiPair } from "../lib/tibetTypes";

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
  const { network } = useNetwork();
  const [localPair, setLocalPair] = useState<TibetApiPair | null>(null);
  const selectedPair = selectedPairFromFilter ?? localPair;
  const [xchAmount, setXchAmount] = useState("");
  const [tokenAmount, setTokenAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const createOfferMutation = useCreateOffer();
  const { createOffer: tibetCreateOffer, isCreating: tibetSubmitting } =
    useTibetCreateOffer();

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
      const xchAssetId =
        network === "testnet" ? CHIA_ASSET_IDS.TXCH : CHIA_ASSET_IDS.XCH;
      const xchMojos = Math.round(convertToSmallestUnit(xch, "xch"));
      const tokenSmallest = Math.round(convertToSmallestUnit(token, "cat"));

      const result = await createOfferMutation.mutateAsync({
        walletId: 1,
        offerAssets: [
          { assetId: xchAssetId, amount: xchMojos },
          { assetId: selectedPair.asset_id, amount: tokenSmallest },
        ],
        requestAssets: [],
      });

      if (!result?.offer) {
        throw new Error("Wallet did not return a valid offer");
      }

      await tibetCreateOffer({
        pair_id: selectedPair.pair_id,
        offer: result.offer,
        action: "ADD_LIQUIDITY",
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

  const isPending = createOfferMutation.isPending || tibetSubmitting;

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
        <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Added.</p>
      )}
      <button
        type="button"
        onClick={handleAdd}
        disabled={!selectedPair || isPending || pairsLoading}
        className={`w-full rounded-xl py-1.5 flex items-center justify-center gap-1.5 text-xs font-medium border ${t.border} disabled:opacity-40 disabled:pointer-events-none bg-gradient-to-r ${t.accent} text-white ${t.accentHover} transition-colors`}
      >
        <Plus size={14} />
        {isPending ? "…" : "Add"}
      </button>
    </div>
  );
}
