/**
 * Cancelling an offer.
 *
 * There is no on-chain "cancel offer" operation. An offer stays takeable for as long as
 * the coins it spends are unspent, so cancelling means racing the taker: spend one of the
 * offer's input coins back to the wallet, which invalidates every bundle that consumed it.
 *
 * `parseOffer(...).cancellableCoinSpends` lists the coins to target. Fetch them with
 * `wallet.getCoinsByIds` (or filter `wallet.getAssetCoins`) so the lineage proofs are
 * present, then pass them here.
 */
import type { ChiaOfferDriver } from "./driver";
import {
  addPreparedCoin,
  hexToBytes,
  finishSpends,
  OfferBuildError,
  prepareCoins,
  selectCoinsFor,
  toMojos,
  type PreparedCoin,
} from "./internal";
import { assembleSpendBundle } from "./spendBundle";
import type {
  CancelOfferInput,
  CancelOfferResult,
  SignCoinSpendsFn,
  UnsignedSpends,
} from "./types";

/** Everything {@link buildCancelOfferSpends} produces, before the wallet signs. */
export interface CancelOfferPlan extends UnsignedSpends {
  /** Coin ids the cancel transaction spends. */
  spentCoinIds: string[];
}

/**
 * Builds the unsigned cancel spends: send the offer's coins back to the wallet.
 *
 * Every coin passed in is spent, and all of it goes back to `changePuzzleHash` (minus the
 * fee), so the offer's inputs are consumed and its bundle can no longer be submitted.
 *
 * @throws OfferBuildError when no coins are given, or the fee cannot be covered.
 */
export function buildCancelOfferSpends(
  driver: ChiaOfferDriver,
  input: CancelOfferInput
): CancelOfferPlan {
  const fee = toMojos(input.fee ?? "0", "fee");
  const changePuzzleHash = hexToBytes(input.changePuzzleHash, "changePuzzleHash");
  if (changePuzzleHash.length !== 32) {
    throw new OfferBuildError("Expected changePuzzleHash to be a 32 byte puzzle hash");
  }

  const clvm = new driver.Clvm();
  // Offer coins are reserved by the wallet while the offer is live, so `locked` must not
  // filter them out here.
  const cancelled = prepareCoins(driver, clvm, input.coins, { skipLocked: false });
  if (cancelled.length === 0) {
    throw new OfferBuildError("Cancelling an offer needs at least one of the coins it spends");
  }

  const selected: PreparedCoin[] = [...cancelled];

  if (fee > BigInt(0) && !cancelled.some((coin) => coin.assetId === null)) {
    const feeCandidates = prepareCoins(driver, clvm, input.feeCoins ?? []);
    selected.push(...selectCoinsFor(driver, feeCandidates, fee, "XCH for the fee"));
  }

  const spends = new driver.Spends(clvm, changePuzzleHash);
  const syntheticKeys = new Map<string, string>();
  for (const coin of selected) {
    addPreparedCoin(driver, spends, coin);
    syntheticKeys.set(coin.p2PuzzleHash, coin.syntheticKey);
  }

  // No `send` action is needed: with nothing to pay out, the action system sends every
  // selected coin's full value back to the change puzzle hash.
  const actions = fee > BigInt(0) ? [driver.Action.fee(fee)] : [];
  const coinSpends = finishSpends(driver, clvm, spends, actions, syntheticKeys);

  return {
    coinSpends,
    partialSign: false,
    spentCoinIds: selected.map((coin) => coin.coinId),
  };
}

/** Assembles the cancel transaction from a plan and the wallet's aggregated signature. */
export function assembleCancelOfferResult(
  plan: CancelOfferPlan,
  aggregatedSignature: string
): CancelOfferResult {
  return { spendBundle: assembleSpendBundle(plan.coinSpends, aggregatedSignature) };
}

/**
 * Cancels an offer end to end: build the spends, sign them through the injected callback,
 * and return the bundle to broadcast with `wallet.sendTransaction`.
 *
 * @param signCoinSpends - normally `wallet.signCoinSpends` from the Sage bridge.
 *
 * @example
 * ```ts
 * const driver = await loadChiaOfferDriver();
 * const parsed = parseOffer(driver, offer);
 * const coinIds = parsed.cancellableCoinSpends.map((spend) => spend.coin);
 * const { spendBundle } = await cancelOffer(driver, {
 *   coins: await wallet.getCoinsByIds({ coinIds }),
 *   changePuzzleHash,
 * }, (coinSpends, { partialSign }) => wallet.signCoinSpends({ coinSpends, partialSign }));
 * ```
 */
export async function cancelOffer(
  driver: ChiaOfferDriver,
  input: CancelOfferInput,
  signCoinSpends: SignCoinSpendsFn
): Promise<CancelOfferResult> {
  const plan = buildCancelOfferSpends(driver, input);
  const signature = await signCoinSpends(plan.coinSpends, { partialSign: plan.partialSign });
  return assembleCancelOfferResult(plan, signature);
}
