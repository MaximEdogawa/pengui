/**
 * Reading an `offer1...` string: what is offered, what is requested, and which coins
 * have to be spent to cancel it.
 *
 * The offer file format is a spend bundle with two kinds of entry:
 *
 * - **real spends** — the maker's own coins, which create coins at a settlement payments
 *   puzzle hash. Those created coins are what the taker receives.
 * - **placeholder spends** — parent coin id all zeroes, amount zero, puzzle reveal equal
 *   to the settlement puzzle (CAT-wrapped for CATs). They never run on chain; their
 *   solution carries the notarized payments the taker must make.
 */
import type { ChiaOfferDriver } from "./driver";
import {
  bytesToHex,
  describe,
  hexToBytes,
  OfferBuildError,
  PUZZLE_INSPECTION_MAX_COST,
  settlementPuzzleHashFor,
  toDriverSpendBundle,
  ZERO_HASH_HEX,
} from "./internal";
import { decodeOfferBundle } from "./spendBundle";
import type {
  OfferCoinSpend,
  OfferSpendBundle,
  ParsedNotarizedPayment,
  ParsedOffer,
  ParsedOfferedCoin,
  ParsedRequestedPayments,
} from "./types";

/** True when a coin spend is a requested-payment placeholder rather than a real spend. */
export function isPlaceholderSpend(coinSpend: OfferCoinSpend): boolean {
  return coinSpend.coin.parent_coin_info.replace(/^0x/i, "").toLowerCase() === ZERO_HASH_HEX;
}

/** A settlement coin the maker created, in driver form, ready to be added to `Spends`. */
export interface OfferedSettlementAssets {
  /** XCH coins sitting at the settlement payments puzzle hash. */
  xchCoins: InstanceType<ChiaOfferDriver["Coin"]>[];
  /** CAT settlement coins, keyed by asset id. */
  cats: Map<string, InstanceType<ChiaOfferDriver["Cat"]>[]>;
}

/**
 * Extracts the settlement coins an offer created, in driver form.
 *
 * CAT coins come from the driver's own offer parser (`Clvm.offerSettlementCats`), which
 * rebuilds the lineage proofs. XCH coins are recovered by running the maker's spends and
 * picking the `CREATE_COIN` conditions that pay into the settlement puzzle.
 *
 * @internal used by the take path; {@link parseOffer} exposes the plain-data view.
 */
export function extractOfferedSettlementAssets(
  driver: ChiaOfferDriver,
  clvm: InstanceType<ChiaOfferDriver["Clvm"]>,
  bundle: OfferSpendBundle
): OfferedSettlementAssets {
  const settlementHash = bytesToHex(driver.Constants.settlementPaymentHash());
  const xchCoins: InstanceType<ChiaOfferDriver["Coin"]>[] = [];
  const assetIds = new Set<string>();

  for (const coinSpend of bundle.coin_spends) {
    if (isPlaceholderSpend(coinSpend)) continue;

    const puzzle = clvm.deserialize(hexToBytes(coinSpend.puzzle_reveal, "puzzle_reveal"));
    const cat = puzzle.puzzle().parseCatInfo();
    if (cat) {
      assetIds.add(bytesToHex(cat.info.assetId));
      continue;
    }

    for (const created of createdCoins(driver, clvm, coinSpend)) {
      if (bytesToHex(created.puzzleHash) === settlementHash) xchCoins.push(created);
    }
  }

  const driverBundle = toDriverSpendBundle(driver, bundle);
  const cats = new Map<string, InstanceType<ChiaOfferDriver["Cat"]>[]>();
  for (const assetId of assetIds) {
    let settlementCats: InstanceType<ChiaOfferDriver["Cat"]>[];
    try {
      settlementCats = clvm.offerSettlementCats(driverBundle, hexToBytes(assetId));
    } catch (error) {
      throw new OfferBuildError(
        `Could not read the offered CAT ${assetId} from the offer: ${describe(error)}`,
        { cause: error }
      );
    }
    if (settlementCats.length > 0) cats.set(assetId, settlementCats);
  }

  return { xchCoins, cats };
}

function createdCoins(
  driver: ChiaOfferDriver,
  clvm: InstanceType<ChiaOfferDriver["Clvm"]>,
  coinSpend: OfferCoinSpend
): InstanceType<ChiaOfferDriver["Coin"]>[] {
  const parent = new driver.Coin(
    hexToBytes(coinSpend.coin.parent_coin_info, "parent_coin_info"),
    hexToBytes(coinSpend.coin.puzzle_hash, "puzzle_hash"),
    BigInt(coinSpend.coin.amount)
  );

  let conditions: InstanceType<ChiaOfferDriver["Program"]>[];
  try {
    const output = clvm
      .deserialize(hexToBytes(coinSpend.puzzle_reveal, "puzzle_reveal"))
      .run(
        clvm.deserialize(hexToBytes(coinSpend.solution, "solution")),
        PUZZLE_INSPECTION_MAX_COST,
        false
      );
    conditions = output.value.toList() ?? [];
  } catch (error) {
    throw new OfferBuildError(`Could not run a coin spend in the offer: ${describe(error)}`, {
      cause: error,
    });
  }

  const coins: InstanceType<ChiaOfferDriver["Coin"]>[] = [];
  for (const condition of conditions) {
    const createCoin = condition.parseCreateCoin();
    if (!createCoin) continue;
    coins.push(new driver.Coin(parent.coinId(), createCoin.puzzleHash, createCoin.amount));
  }
  return coins;
}

function parseNotarizedPayments(
  clvm: InstanceType<ChiaOfferDriver["Clvm"]>,
  solutionHex: string
): ParsedNotarizedPayment[] {
  const solution = clvm.deserialize(hexToBytes(solutionHex, "solution"));
  const items = solution.toList();
  if (!items) {
    throw new OfferBuildError("A requested-payment spend has a malformed solution");
  }

  return items.map((item) => {
    const notarized = item.parseNotarizedPayment();
    if (!notarized) {
      throw new OfferBuildError("A requested-payment spend has a malformed notarized payment");
    }
    return {
      nonce: bytesToHex(notarized.nonce),
      payments: notarized.payments.map((payment) => ({
        puzzleHash: bytesToHex(payment.puzzleHash),
        amount: payment.amount.toString(),
        ...(payment.memos ? { memos: bytesToHex(payment.memos.serialize()) } : {}),
      })),
    };
  });
}

/**
 * Parses an `offer1...` string into a structured, JSON-serialisable view.
 *
 * @param driver - a loaded Chia driver.
 * @param offer - the offer string.
 *
 * @throws OfferBuildError when the string is not a decodable offer.
 *
 * @example
 * ```ts
 * const parsed = parseOffer(driver, offerString);
 * parsed.requestedPayments[0].totalAmount; // what the taker has to pay
 * parsed.cancellableCoinSpends.map((s) => s.coin); // coins to spend to cancel
 * ```
 */
export function parseOffer(driver: ChiaOfferDriver, offer: string): ParsedOffer {
  const clvm = new driver.Clvm();
  const bundle = decodeOfferBundle(driver, offer);
  const settlementHash = bytesToHex(driver.Constants.settlementPaymentHash());

  const requestedPayments: ParsedRequestedPayments[] = [];
  const offeredCoins: ParsedOfferedCoin[] = [];
  const createdCoinIds = new Set<string>();
  let hasUnsupportedAssets = false;

  for (const coinSpend of bundle.coin_spends) {
    const puzzle = clvm.deserialize(hexToBytes(coinSpend.puzzle_reveal, "puzzle_reveal"));
    const parsedPuzzle = puzzle.puzzle();
    const cat = parsedPuzzle.parseCatInfo();
    const assetId = cat ? bytesToHex(cat.info.assetId) : null;

    if (isPlaceholderSpend(coinSpend)) {
      const innerPuzzleHash = cat
        ? bytesToHex(cat.info.p2PuzzleHash)
        : bytesToHex(parsedPuzzle.puzzleHash);
      if (innerPuzzleHash !== settlementHash) {
        hasUnsupportedAssets = true;
        continue;
      }

      const notarizedPayments = parseNotarizedPayments(clvm, coinSpend.solution);
      const total = notarizedPayments
        .flatMap((notarized) => notarized.payments)
        .reduce((sum, payment) => sum + BigInt(payment.amount), BigInt(0));

      requestedPayments.push({
        assetId,
        settlementPuzzleHash: coinSpend.coin.puzzle_hash,
        puzzleReveal: coinSpend.puzzle_reveal,
        notarizedPayments,
        totalAmount: total.toString(),
      });
      continue;
    }

    if (!cat && bytesToHex(parsedPuzzle.modHash) !== standardModHash(driver)) {
      // Singletons (NFT, DID, option contracts) reach this branch.
      hasUnsupportedAssets = true;
    }

    const expectedSettlementHash = settlementPuzzleHashFor(driver, assetId);
    for (const created of createdCoins(driver, clvm, coinSpend)) {
      createdCoinIds.add(bytesToHex(created.coinId()));
      if (bytesToHex(created.puzzleHash) !== expectedSettlementHash) continue;
      offeredCoins.push({
        assetId,
        settlementPuzzleHash: expectedSettlementHash,
        coin: {
          parent_coin_info: bytesToHex(created.parentCoinInfo),
          puzzle_hash: bytesToHex(created.puzzleHash),
          amount: created.amount.toString(),
        },
      });
    }
  }

  const cancellableCoinSpends = bundle.coin_spends.filter((coinSpend) => {
    if (isPlaceholderSpend(coinSpend)) return false;
    const coinId = bytesToHex(
      new driver.Coin(
        hexToBytes(coinSpend.coin.parent_coin_info),
        hexToBytes(coinSpend.coin.puzzle_hash),
        BigInt(coinSpend.coin.amount)
      ).coinId()
    );
    return !createdCoinIds.has(coinId);
  });

  return {
    offer: offer.trim(),
    coinSpends: bundle.coin_spends,
    aggregatedSignature: bundle.aggregated_signature,
    offeredCoins,
    requestedPayments,
    cancellableCoinSpends,
    hasUnsupportedAssets,
  };
}

function standardModHash(driver: ChiaOfferDriver): string {
  return bytesToHex(driver.Constants.p2DelegatedPuzzleOrHiddenPuzzleHash());
}
