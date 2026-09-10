/**
 * Maker side of an offer: turn "give these assets, want those assets" into coin spends,
 * an aggregated signature and a bech32m `offer1...` string.
 *
 * The Sage app bridge has no `chia_createOffer` equivalent, so the offer is assembled
 * here and only the signature comes from the wallet (`wallet.signCoinSpends`).
 *
 * The resulting bundle has the same shape as `Offer::to_spend_bundle` in
 * `chia-sdk-driver`, which is what Sage and the reference wallet produce:
 *
 * - one spend per selected input coin, creating a coin at the settlement payments puzzle
 *   hash for every offered asset (CAT offers are wrapped in the CAT layer), plus change;
 * - `ASSERT_PUZZLE_ANNOUNCEMENT` conditions binding the offer to the requested payments;
 * - one placeholder spend per requested asset, with parent coin id all zeroes and amount
 *   zero, whose solution carries the notarized payments the taker has to make.
 */
import type { ChiaOfferDriver } from "./driver";
import {
  addPreparedCoin,
  bytesToHex,
  hexToBytes,
  hintMemos,
  finishSpends,
  normaliseAssetId,
  notarizedPaymentNonce,
  OfferBuildError,
  paymentAssertionId,
  prepareCoins,
  selectCoinsFor,
  settlementPuzzleFor,
  settlementPuzzleHashFor,
  toMojos,
  toOfferCoinSpend,
  type PreparedCoin,
} from "./internal";
import { assembleSpendBundle, encodeOfferBundle } from "./spendBundle";
import type {
  CreateOfferInput,
  CreateOfferResult,
  OfferAssetAmount,
  OfferCoinSpend,
  SignCoinSpendsFn,
  UnsignedSpends,
} from "./types";

/** Everything {@link buildCreateOfferSpends} produces, before the wallet signs. */
export interface CreateOfferPlan extends UnsignedSpends {
  /**
   * The requested-payment placeholder spends. They are appended to the finished bundle
   * but never signed: their coin does not exist and they carry no `AGG_SIG` condition.
   */
  requestedPaymentSpends: OfferCoinSpend[];
  /**
   * Coin ids the offer consumes. Spending any of them back to the wallet cancels the
   * offer; see `buildCancelOfferSpends`.
   */
  cancellableCoinIds: string[];
}

function sumAssets(assets: OfferAssetAmount[], label: string): Map<string | null, bigint> {
  const totals = new Map<string | null, bigint>();
  for (const asset of assets) {
    const assetId = normaliseAssetId(asset.assetId);
    const amount = toMojos(asset.amount, `${label} amount`);
    if (amount <= BigInt(0)) {
      throw new OfferBuildError(`${label} amounts must be greater than zero`);
    }
    totals.set(assetId, (totals.get(assetId) ?? BigInt(0)) + amount);
  }
  return totals;
}

/**
 * Builds the unsigned maker spends for an offer.
 *
 * @param driver - a loaded Chia driver (see {@link loadChiaOfferDriver}).
 * @param input - offered and requested assets, spendable coins, change address and fee.
 * @returns the spends to sign plus the placeholder spends to append afterwards.
 *
 * @throws OfferBuildError when the inputs are inconsistent or the coins cannot cover the
 *   offered amounts and the fee.
 */
export function buildCreateOfferSpends(
  driver: ChiaOfferDriver,
  input: CreateOfferInput
): CreateOfferPlan {
  const offered = sumAssets(input.offerAssets, "Offered asset");
  const requested = sumAssets(input.requestAssets, "Requested asset");

  if (offered.size === 0) {
    throw new OfferBuildError("An offer must give away at least one asset");
  }
  if (requested.size === 0) {
    throw new OfferBuildError("An offer must request at least one asset");
  }
  for (const assetId of requested.keys()) {
    if (offered.has(assetId)) {
      throw new OfferBuildError(
        `Asset ${assetId ?? "XCH"} appears on both sides of the offer; that cannot be settled`
      );
    }
  }

  const fee = toMojos(input.fee ?? "0", "fee");
  const changePuzzleHash = normaliseHex(input.changePuzzleHash, "changePuzzleHash");
  const receivePuzzleHash = normaliseHex(
    input.receivePuzzleHash ?? input.changePuzzleHash,
    "receivePuzzleHash"
  );

  const clvm = new driver.Clvm();
  const available = prepareCoins(driver, clvm, input.coins);

  const selected: PreparedCoin[] = [];
  for (const [assetId, amount] of offered) {
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
  if (fee > BigInt(0) && !offered.has(null)) {
    selected.push(
      ...selectCoinsFor(
        driver,
        available.filter((coin) => coin.assetId === null),
        fee,
        "XCH for the fee"
      )
    );
  }

  const spends = new driver.Spends(clvm, hexToBytes(changePuzzleHash, "changePuzzleHash"));
  const syntheticKeys = new Map<string, string>();
  for (const coin of selected) {
    addPreparedCoin(driver, spends, coin);
    syntheticKeys.set(coin.p2PuzzleHash, coin.syntheticKey);
  }

  // The nonce notarises the requested payments against exactly the coins this offer
  // spends, so the payments cannot be replayed against a different offer.
  const nonce = notarizedPaymentNonce(
    driver,
    selected.map((coin) => coin.coinId)
  );

  const requestedPaymentSpends: OfferCoinSpend[] = [];
  for (const [assetId, amount] of requested) {
    const settlementPuzzleHash = settlementPuzzleHashFor(driver, assetId);
    const notarizedPayment = new driver.NotarizedPayment(hexToBytes(nonce), [
      new driver.Payment(
        hexToBytes(receivePuzzleHash, "receivePuzzleHash"),
        amount,
        hintMemos(clvm, receivePuzzleHash)
      ),
    ]);

    spends.addRequiredCondition(
      clvm.assertPuzzleAnnouncement(
        paymentAssertionId(driver, clvm, settlementPuzzleHash, notarizedPayment)
      )
    );

    requestedPaymentSpends.push(
      toOfferCoinSpend(
        new driver.CoinSpend(
          new driver.Coin(new Uint8Array(32), hexToBytes(settlementPuzzleHash), BigInt(0)),
          settlementPuzzleFor(driver, clvm, assetId).serialize(),
          clvm.alloc([notarizedPayment]).serialize()
        )
      )
    );
  }

  const settlementPuzzleHash = bytesToHex(driver.Constants.settlementPaymentHash());
  const actions = [...offered].map(([assetId, amount]) =>
    driver.Action.send(
      assetId === null ? driver.Id.xch() : driver.Id.existing(hexToBytes(assetId)),
      hexToBytes(settlementPuzzleHash),
      amount,
      undefined
    )
  );
  if (fee > BigInt(0)) actions.push(driver.Action.fee(fee));

  const coinSpends = finishSpends(driver, clvm, spends, actions, syntheticKeys);

  return {
    coinSpends,
    // The maker's bundle is deliberately incomplete: it creates settlement coins nobody
    // has spent yet, so Sage must not insist on a fully signable transaction.
    partialSign: true,
    requestedPaymentSpends,
    cancellableCoinIds: selected.map((coin) => coin.coinId),
  };
}

/**
 * Assembles the finished offer from a plan and the wallet's aggregated signature.
 *
 * @param aggregatedSignature - the hex signature returned by `wallet.signCoinSpends`.
 */
export function assembleCreateOfferResult(
  driver: ChiaOfferDriver,
  plan: CreateOfferPlan,
  aggregatedSignature: string
): CreateOfferResult {
  const spendBundle = assembleSpendBundle(
    [...plan.coinSpends, ...plan.requestedPaymentSpends],
    aggregatedSignature
  );

  return {
    offer: encodeOfferBundle(driver, spendBundle),
    spendBundle,
    cancellableCoinIds: plan.cancellableCoinIds,
  };
}

/**
 * Creates an offer end to end: build the spends, sign them through the injected
 * callback, and return the `offer1...` string.
 *
 * @param signCoinSpends - normally `wallet.signCoinSpends` from the Sage bridge. It is a
 *   parameter so this module stays independent of any wallet provider.
 *
 * @example
 * ```ts
 * const driver = await loadChiaOfferDriver();
 * const { offer } = await createOffer(driver, {
 *   coins: await wallet.getAssetCoins({}),
 *   changePuzzleHash,
 *   offerAssets: [{ assetId: null, amount: "100000000000" }],
 *   requestAssets: [{ assetId: catId, amount: "1000" }],
 * }, (coinSpends, { partialSign }) => wallet.signCoinSpends({ coinSpends, partialSign }));
 * ```
 */
export async function createOffer(
  driver: ChiaOfferDriver,
  input: CreateOfferInput,
  signCoinSpends: SignCoinSpendsFn
): Promise<CreateOfferResult> {
  const plan = buildCreateOfferSpends(driver, input);
  const signature = await signCoinSpends(plan.coinSpends, { partialSign: plan.partialSign });
  return assembleCreateOfferResult(driver, plan, signature);
}

function normaliseHex(value: string, label: string): string {
  const bytes = hexToBytes(value, label);
  if (bytes.length !== 32) {
    throw new OfferBuildError(`Expected ${label} to be a 32 byte puzzle hash`);
  }
  return bytesToHex(bytes);
}
