/**
 * Taker side of an offer: pay what the maker asked for, claim what the maker offered.
 *
 * The taker bundle contains three kinds of spend:
 *
 * 1. the maker's settlement coins, spent to the taker (this is the claim);
 * 2. the taker's own coins, spent to create settlement coins for the requested assets
 *    plus change and the fee;
 * 3. those freshly created settlement coins, spent immediately with the maker's exact
 *    notarized payments — which emits the puzzle announcement the maker's offer asserts.
 *
 * The action system in `chia-wallet-sdk` produces all three from a set of
 * `Action.settle(...)` actions; steps 1 and 3 need no signature, so only step 2 carries
 * `AGG_SIG_ME` conditions.
 *
 * The finished bundle is the maker's spends (including the placeholder spends, which the
 * mempool ignores because their parent coin id is all zeroes) plus the taker's spends,
 * with the two aggregated signatures added together.
 */
import type { ChiaOfferDriver } from "./driver";
import {
  addPreparedCoin,
  bytesToHex,
  hexToBytes,
  finishSpends,
  OfferBuildError,
  prepareCoins,
  selectCoinsFor,
  toMojos,
  type PreparedCoin,
} from "./internal";
import { extractOfferedSettlementAssets, isPlaceholderSpend } from "./parseOffer";
import { aggregateSignatures, assembleSpendBundle, decodeOfferBundle } from "./spendBundle";
import type {
  OfferCoinSpend,
  OfferSpendBundle,
  SignCoinSpendsFn,
  TakeOfferInput,
  TakeOfferResult,
  UnsignedSpends,
} from "./types";

/** Everything {@link buildTakeOfferSpends} produces, before the wallet signs. */
export interface TakeOfferPlan extends UnsignedSpends {
  /** The maker's bundle, decoded from the offer string. */
  makerBundle: OfferSpendBundle;
  /** Total the taker pays per asset, keyed by asset id (`null` is XCH). Decimal mojos. */
  payments: { assetId: string | null; amount: string }[];
}

/**
 * Builds the unsigned taker spends for an offer.
 *
 * The taker receives the offered assets at `changePuzzleHash`: the action system sends
 * every unclaimed settlement asset there, so that address must belong to the taker.
 *
 * @throws OfferBuildError when the offer cannot be parsed, contains an asset kind this
 *   driver cannot settle, or the taker's coins cannot cover the requested amounts.
 */
export function buildTakeOfferSpends(
  driver: ChiaOfferDriver,
  input: TakeOfferInput
): TakeOfferPlan {
  const fee = toMojos(input.fee ?? "0", "fee");
  const changePuzzleHash = hexToBytes(input.changePuzzleHash, "changePuzzleHash");
  if (changePuzzleHash.length !== 32) {
    throw new OfferBuildError("Expected changePuzzleHash to be a 32 byte puzzle hash");
  }

  const clvm = new driver.Clvm();
  const makerBundle = decodeOfferBundle(driver, input.offer);
  const offered = extractOfferedSettlementAssets(driver, clvm, makerBundle);

  const spends = new driver.Spends(clvm, changePuzzleHash);
  for (const coin of offered.xchCoins) spends.addXch(coin);
  for (const cats of offered.cats.values()) {
    for (const cat of cats) spends.addCat(cat);
  }

  const actions: InstanceType<ChiaOfferDriver["Action"]>[] = [];
  const owed = new Map<string | null, bigint>();

  for (const coinSpend of makerBundle.coin_spends) {
    if (!isPlaceholderSpend(coinSpend)) continue;

    const puzzle = clvm.deserialize(hexToBytes(coinSpend.puzzle_reveal, "puzzle_reveal")).puzzle();
    const cat = puzzle.parseCatInfo();
    const assetId = cat ? bytesToHex(cat.info.assetId) : null;
    const innerPuzzleHash = cat ? bytesToHex(cat.info.p2PuzzleHash) : bytesToHex(puzzle.puzzleHash);
    if (innerPuzzleHash !== bytesToHex(driver.Constants.settlementPaymentHash())) {
      throw new OfferBuildError(
        "This offer requests an asset kind that cannot be settled by this driver " +
          "(only XCH and CAT payments are supported)"
      );
    }

    const notarizedPayments = clvm.deserialize(hexToBytes(coinSpend.solution, "solution")).toList();
    if (!notarizedPayments) {
      throw new OfferBuildError("A requested-payment spend has a malformed solution");
    }

    for (const item of notarizedPayments) {
      const notarized = item.parseNotarizedPayment();
      if (!notarized) {
        throw new OfferBuildError("A requested-payment spend has a malformed notarized payment");
      }
      const total = notarized.payments.reduce((sum, payment) => sum + payment.amount, BigInt(0));
      owed.set(assetId, (owed.get(assetId) ?? BigInt(0)) + total);
      actions.push(
        driver.Action.settle(
          assetId === null ? driver.Id.xch() : driver.Id.existing(hexToBytes(assetId)),
          notarized
        )
      );
    }
  }

  if (actions.length === 0) {
    throw new OfferBuildError("This offer does not request anything, so there is nothing to take");
  }

  const available = prepareCoins(driver, clvm, input.coins);
  const syntheticKeys = new Map<string, string>();
  const selected: PreparedCoin[] = [];

  for (const [assetId, amount] of owed) {
    const needed = assetId === null ? amount + fee : amount;
    selected.push(
      ...selectCoinsFor(
        driver,
        available.filter((coin) => coin.assetId === assetId),
        needed,
        assetId === null ? "XCH" : `CAT ${assetId}`
      )
    );
  }
  if (fee > BigInt(0) && !owed.has(null)) {
    selected.push(
      ...selectCoinsFor(
        driver,
        available.filter((coin) => coin.assetId === null),
        fee,
        "XCH for the fee"
      )
    );
  }

  for (const coin of selected) {
    addPreparedCoin(driver, spends, coin);
    syntheticKeys.set(coin.p2PuzzleHash, coin.syntheticKey);
  }
  if (fee > BigInt(0)) actions.push(driver.Action.fee(fee));

  const coinSpends = finishSpends(driver, clvm, spends, actions, syntheticKeys);

  return {
    coinSpends,
    // Every spend that needs a signature belongs to the taker; a missing key here is a
    // real error rather than an expected gap, so the wallet should not skip it.
    partialSign: false,
    makerBundle,
    payments: [...owed].map(([assetId, amount]) => ({ assetId, amount: amount.toString() })),
  };
}

/**
 * Combines the maker's bundle with the taker's signed spends.
 *
 * @param aggregatedSignature - the taker's signature from `wallet.signCoinSpends`. It is
 *   added to the maker's signature carried by the offer.
 */
export function assembleTakeOfferResult(
  driver: ChiaOfferDriver,
  plan: TakeOfferPlan,
  aggregatedSignature: string
): TakeOfferResult {
  const signature = aggregateSignatures(driver, [
    plan.makerBundle.aggregated_signature,
    aggregatedSignature,
  ]);

  const coinSpends: OfferCoinSpend[] = [
    ...plan.makerBundle.coin_spends.filter((coinSpend) => !isPlaceholderSpend(coinSpend)),
    ...plan.coinSpends,
  ];

  return {
    spendBundle: assembleSpendBundle(coinSpends, signature),
    takerCoinSpends: plan.coinSpends,
  };
}

/**
 * Takes an offer end to end: build the taker spends, sign them through the injected
 * callback, and return the bundle to broadcast with `wallet.sendTransaction`.
 *
 * @param signCoinSpends - normally `wallet.signCoinSpends` from the Sage bridge.
 *
 * @example
 * ```ts
 * const driver = await loadChiaOfferDriver();
 * const { spendBundle } = await takeOffer(driver, {
 *   offer,
 *   coins: await wallet.getAssetCoins({}),
 *   changePuzzleHash,
 *   fee: "0",
 * }, (coinSpends, { partialSign }) => wallet.signCoinSpends({ coinSpends, partialSign }));
 * await wallet.sendTransaction({ spendBundle });
 * ```
 */
export async function takeOffer(
  driver: ChiaOfferDriver,
  input: TakeOfferInput,
  signCoinSpends: SignCoinSpendsFn
): Promise<TakeOfferResult> {
  const plan = buildTakeOfferSpends(driver, input);
  const signature = await signCoinSpends(plan.coinSpends, { partialSign: plan.partialSign });
  return assembleTakeOfferResult(driver, plan, signature);
}
