"use client";

import { useCreateOffer } from "@/features/wallet";
import { useNetwork } from "@/shared/hooks/useNetwork";
import { CHIA_ASSET_IDS } from "@/shared/lib/constants/chia-assets";
import { broadcastOfferToSplash } from "@/features/splash-terminal";
import type { TibetApiPair } from "../lib/tibetTypes";
import { useTibetCreateOffer } from "./useTibetCreateOffer";

/** Minimum blockchain fee in mojos. Tibet's estimate can come back near-zero; this ensures
 *  the transaction is relayed by full nodes. 1,000,000 mojos = 0.000001 XCH. */
const MIN_FEE_MOJOS = 1_000_000;

function clampFee(fee: number | undefined): number | undefined {
  if (fee == null || fee <= 0) return undefined;
  return Math.max(fee, MIN_FEE_MOJOS);
}

/**
 * Unified hook for all Tibet swap offer operations.
 *
 * Each method encapsulates two steps that always go together:
 *   1. Create a signed wallet offer (what you give vs what you receive)
 *   2. Submit that offer to the Tibet API so it gets picked up and processed
 *
 * Operation offer shapes:
 *   swap          – give one asset, receive the other (amount from Tibet quote)
 *   addLiquidity  – give XCH + token, receive LP tokens
 *   removeLiquidity – give LP tokens, receive XCH + token
 */
export function useTibetOffer() {
  const { network } = useNetwork();
  const walletOffer = useCreateOffer();
  const { createOffer: tibetSubmit, isCreating: isTibetPending } = useTibetCreateOffer();

  const xchAssetId = network === "testnet" ? CHIA_ASSET_IDS.TXCH : CHIA_ASSET_IDS.XCH;
  const isPending = walletOffer.isPending || isTibetPending;

  async function swap({
    pair,
    giveAssetId,
    giveAmount,
    receiveAssetId,
    receiveAmount,
    fee,
  }: {
    pair: TibetApiPair;
    giveAssetId: string;
    giveAmount: number;
    /** Tibet's server-computed amount_out — must match exactly so Tibet accepts the offer. */
    receiveAssetId: string;
    receiveAmount: number;
    fee?: number;
  }): Promise<string> {
    const effectiveFee = clampFee(fee);
    const result = await walletOffer.mutateAsync({
      walletId: 1,
      offerAssets: [{ assetId: giveAssetId, amount: giveAmount }],
      requestAssets: [{ assetId: receiveAssetId, amount: receiveAmount }],
      ...(effectiveFee !== undefined && { fee: effectiveFee }),
    });
    if (!result?.offer) throw new Error("Wallet did not return a valid offer");
    await tibetSubmit({ pair_id: pair.pair_id, offer: result.offer, action: "SWAP" });
    return result.offer;
  }

  async function addLiquidity({
    pair,
    xchAmount,
    tokenAmount,
    lpAmount,
    fee,
  }: {
    pair: TibetApiPair;
    /** Pool XCH to deposit (mojos). The offer will include lpAmount on top — see below. */
    xchAmount: number;
    /** Token smallest units to deposit. */
    tokenAmount: number;
    /** LP tokens to receive — computed from floor(share * liquidity) to match AMM formula. */
    lpAmount: number;
    fee?: number;
  }): Promise<string> {
    const effectiveFee = clampFee(fee);
    // Tibet AMM protocol: LP tokens are minted from a XCH coin, so their mojo value is
    // embedded in the XCH side of the offer. The wallet must offer xchAmount + lpAmount XCH.
    // Reference: tibet-ui Liquidity.tsx — `xchAmount += liquidity`
    const result = await walletOffer.mutateAsync({
      walletId: 1,
      offerAssets: [
        { assetId: xchAssetId, amount: xchAmount + lpAmount },
        { assetId: pair.asset_id, amount: tokenAmount },
      ],
      requestAssets: [{ assetId: pair.liquidity_asset_id, amount: lpAmount }],
      ...(effectiveFee !== undefined && { fee: effectiveFee }),
    });
    if (!result?.offer) throw new Error("Wallet did not return a valid offer");
    await tibetSubmit({ pair_id: pair.pair_id, offer: result.offer, action: "ADD_LIQUIDITY" });
    void broadcastOfferToSplash(result.offer);
    return result.offer;
  }

  async function removeLiquidity({
    pair,
    lpAmount,
    xchAmount,
    tokenAmount,
    fee,
  }: {
    pair: TibetApiPair;
    /** LP tokens to burn. */
    lpAmount: number;
    /** Pool XCH to receive (mojos). The offer will request lpAmount on top — see below. */
    xchAmount: number;
    /** Token smallest units to receive — floor(token_reserve * lp / liquidity). */
    tokenAmount: number;
    fee?: number;
  }): Promise<string> {
    const effectiveFee = clampFee(fee);
    // Tibet AMM protocol: LP coins carry XCH that is returned when they are burned.
    // The XCH received = proportional pool XCH + lp_amount (the LP coin's own XCH value).
    // Reference: tibet-ui Liquidity.tsx — `xchAmount += liquidity`
    const result = await walletOffer.mutateAsync({
      walletId: 1,
      offerAssets: [{ assetId: pair.liquidity_asset_id, amount: lpAmount }],
      requestAssets: [
        { assetId: xchAssetId, amount: xchAmount + lpAmount },
        { assetId: pair.asset_id, amount: tokenAmount },
      ],
      ...(effectiveFee !== undefined && { fee: effectiveFee }),
    });
    if (!result?.offer) throw new Error("Wallet did not return a valid offer");
    await tibetSubmit({ pair_id: pair.pair_id, offer: result.offer, action: "REMOVE_LIQUIDITY" });
    void broadcastOfferToSplash(result.offer);
    return result.offer;
  }

  return { swap, addLiquidity, removeLiquidity, isPending };
}
