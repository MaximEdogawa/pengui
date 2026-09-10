/**
 * Shared internals for the offer builders. Not part of the public API.
 *
 * Everything here is deliberately free of React, provider and feature imports: it only
 * needs a loaded {@link ChiaOfferDriver} and plain data.
 */
import type { ChiaOfferDriver } from "./driver";
import type { AssetCoinInput, OfferCoinSpend, OfferSpendBundle } from "./types";

/** Thrown when an offer cannot be constructed from the given inputs. */
export class OfferBuildError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "OfferBuildError";
  }
}

/** 32 zero bytes as hex. The parent coin id of a requested-payment placeholder spend. */
export const ZERO_HASH_HEX = "0".repeat(64);

/** Maximum CLVM cost allowed when running a puzzle to inspect its conditions. */
const MAX_CLVM_COST = BigInt("11000000000");

/** Condition opcodes used when inspecting or building spends. */
const CONDITION_ASSERT_PUZZLE_ANNOUNCEMENT = 63;

export function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (const byte of bytes) hex += byte.toString(16).padStart(2, "0");
  return hex;
}

export function hexToBytes(value: string, label = "value"): Uint8Array {
  const normalised = value.startsWith("0x") || value.startsWith("0X") ? value.slice(2) : value;
  if (normalised.length % 2 !== 0 || /[^0-9a-fA-F]/.test(normalised)) {
    throw new OfferBuildError(`Expected ${label} to be hex, received "${value}"`);
  }
  return Uint8Array.from(normalised.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16));
}

/** Parses a mojo amount that may arrive as a decimal string or a JSON number. */
export function toMojos(
  amount: string | number | bigint | null | undefined,
  label: string
): bigint {
  if (amount === null || amount === undefined) return BigInt(0);
  if (typeof amount === "bigint") return amount;
  if (typeof amount === "number") {
    if (!Number.isInteger(amount)) {
      throw new OfferBuildError(`Expected ${label} to be a whole number of mojos, got ${amount}`);
    }
    if (!Number.isSafeInteger(amount)) {
      throw new OfferBuildError(
        `${label} (${amount}) exceeds Number.MAX_SAFE_INTEGER; pass it as a decimal string`
      );
    }
    return BigInt(amount);
  }
  const trimmed = amount.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new OfferBuildError(`Expected ${label} to be a decimal mojo amount, got "${amount}"`);
  }
  return BigInt(trimmed);
}

/** Normalises an asset id: XCH is `null`, a CAT is 64 lower-case hex characters. */
export function normaliseAssetId(assetId: string | null | undefined): string | null {
  if (assetId === null || assetId === undefined) return null;
  const trimmed = assetId.trim();
  if (trimmed === "" || trimmed.toLowerCase() === "xch") return null;
  const normalised = (
    trimmed.startsWith("0x") || trimmed.startsWith("0X") ? trimmed.slice(2) : trimmed
  ).toLowerCase();
  if (normalised.length !== 64 || /[^0-9a-f]/.test(normalised)) {
    throw new OfferBuildError(`Expected a 32 byte CAT asset id, got "${assetId}"`);
  }
  return normalised;
}

/** What was recovered from a coin's puzzle reveal. */
export interface RecoveredCoinPuzzle {
  /** `null` for XCH, otherwise the CAT asset id (hex). */
  assetId: string | null;
  /** The inner (p2) puzzle hash the coin is controlled by, hex. */
  p2PuzzleHash: string;
  /** The synthetic BLS public key curried into the standard puzzle, hex. */
  syntheticKey: string;
  /** Hidden puzzle hash for revocable CATs, hex, when present. */
  hiddenPuzzleHash: string | null;
}

/**
 * Recovers the asset id and synthetic public key from a coin's puzzle reveal.
 *
 * `wallet.getAssetCoins` returns the full puzzle reveal for every coin, which is enough
 * to rebuild the standard spend without asking the wallet for derivation keys. XCH coins
 * reveal `p2_delegated_puzzle_or_hidden_puzzle` curried with the synthetic key; CAT coins
 * wrap that in the CAT layer.
 *
 * @throws OfferBuildError when the puzzle is not a supported standard or CAT puzzle.
 */
export function recoverCoinPuzzle(
  driver: ChiaOfferDriver,
  clvm: InstanceType<ChiaOfferDriver["Clvm"]>,
  puzzleRevealHex: string
): RecoveredCoinPuzzle {
  const program = clvm.deserialize(hexToBytes(puzzleRevealHex, "puzzle reveal"));
  const puzzle = program.puzzle();

  const cat = puzzle.parseCatInfo();
  if (cat) {
    return {
      assetId: bytesToHex(cat.info.assetId),
      p2PuzzleHash: bytesToHex(cat.info.p2PuzzleHash),
      syntheticKey: syntheticKeyFromStandardPuzzle(driver, cat.p2Puzzle),
      hiddenPuzzleHash: cat.info.hiddenPuzzleHash ? bytesToHex(cat.info.hiddenPuzzleHash) : null,
    };
  }

  return {
    assetId: null,
    p2PuzzleHash: bytesToHex(puzzle.puzzleHash),
    syntheticKey: syntheticKeyFromStandardPuzzle(driver, puzzle),
    hiddenPuzzleHash: null,
  };
}

function syntheticKeyFromStandardPuzzle(
  driver: ChiaOfferDriver,
  puzzle: InstanceType<ChiaOfferDriver["Puzzle"]> | undefined
): string {
  const standardModHash = bytesToHex(driver.Constants.p2DelegatedPuzzleOrHiddenPuzzleHash());
  if (!puzzle || bytesToHex(puzzle.modHash) !== standardModHash) {
    throw new OfferBuildError(
      "Coin is not controlled by the standard puzzle; only standard XCH and CAT coins can be spent by this driver"
    );
  }
  const args = puzzle.args?.toArgList();
  const key = args?.[0]?.toAtom();
  if (!key || key.length !== 48) {
    throw new OfferBuildError("Could not recover the synthetic public key from the puzzle reveal");
  }
  return bytesToHex(key);
}

/** A coin plus everything the driver needs to spend it. */
export interface PreparedCoin {
  input: AssetCoinInput;
  coinId: string;
  assetId: string | null;
  amount: bigint;
  p2PuzzleHash: string;
  syntheticKey: string;
  hiddenPuzzleHash: string | null;
  coin: InstanceType<ChiaOfferDriver["Coin"]>;
}

/**
 * Validates the caller's coins and recovers their puzzle information.
 *
 * @param skipLocked - drop coins flagged `locked` by the wallet. Defaults to true.
 */
export function prepareCoins(
  driver: ChiaOfferDriver,
  clvm: InstanceType<ChiaOfferDriver["Clvm"]>,
  coins: AssetCoinInput[],
  { skipLocked = true }: { skipLocked?: boolean } = {}
): PreparedCoin[] {
  const prepared: PreparedCoin[] = [];

  for (const input of coins) {
    if (skipLocked && input.locked) continue;
    if (!input.puzzle) {
      throw new OfferBuildError(
        `Coin ${input.coinName ?? input.coin.parent_coin_info} has no puzzle reveal; ` +
          "request coins with wallet.getAssetCoins so the puzzle is included"
      );
    }

    const amount = toMojos(input.coin.amount, "coin amount");
    const coin = new driver.Coin(
      hexToBytes(input.coin.parent_coin_info, "parent_coin_info"),
      hexToBytes(input.coin.puzzle_hash, "puzzle_hash"),
      amount
    );
    const coinId = bytesToHex(coin.coinId());

    if (input.coinName) {
      const expected = normaliseHash(input.coinName);
      if (expected !== coinId) {
        throw new OfferBuildError(
          `Coin id mismatch: wallet reported ${expected} but the coin hashes to ${coinId}`
        );
      }
    }

    const recovered = recoverCoinPuzzle(driver, clvm, input.puzzle);
    if (bytesToHex(coin.puzzleHash) !== puzzleHashOf(driver, recovered)) {
      throw new OfferBuildError(
        `Puzzle reveal for coin ${coinId} does not hash to the coin's puzzle hash`
      );
    }

    prepared.push({
      input,
      coinId,
      amount,
      coin,
      assetId: recovered.assetId,
      p2PuzzleHash: recovered.p2PuzzleHash,
      syntheticKey: recovered.syntheticKey,
      hiddenPuzzleHash: recovered.hiddenPuzzleHash,
    });
  }

  return prepared;
}

function puzzleHashOf(driver: ChiaOfferDriver, recovered: RecoveredCoinPuzzle): string {
  if (recovered.assetId === null) return recovered.p2PuzzleHash;
  const inner = recovered.hiddenPuzzleHash
    ? bytesToHex(
        new driver.CatInfo(
          hexToBytes(recovered.assetId),
          hexToBytes(recovered.hiddenPuzzleHash),
          hexToBytes(recovered.p2PuzzleHash)
        ).innerPuzzleHash()
      )
    : recovered.p2PuzzleHash;
  return bytesToHex(driver.catPuzzleHash(hexToBytes(recovered.assetId), hexToBytes(inner)));
}

function normaliseHash(value: string): string {
  return (value.startsWith("0x") || value.startsWith("0X") ? value.slice(2) : value).toLowerCase();
}

/**
 * Selects coins covering `amount` from `candidates`, all of the same asset.
 *
 * Delegates to the driver's `selectCoins`, which is the same knapsack-ish selection the
 * Rust SDK and Sage use.
 *
 * @throws OfferBuildError when the candidates cannot cover the amount.
 */
export function selectCoinsFor(
  driver: ChiaOfferDriver,
  candidates: PreparedCoin[],
  amount: bigint,
  label: string
): PreparedCoin[] {
  if (amount <= BigInt(0)) return [];

  const total = candidates.reduce((sum, coin) => sum + coin.amount, BigInt(0));
  if (total < amount) {
    throw new OfferBuildError(
      `Not enough ${label} to cover ${amount.toString()} (spendable: ${total.toString()})`
    );
  }

  const byId = new Map(candidates.map((coin) => [coin.coinId, coin]));
  let selected: InstanceType<ChiaOfferDriver["Coin"]>[];
  try {
    selected = driver.selectCoins(
      candidates.map((coin) => coin.coin),
      amount
    );
  } catch (error) {
    throw new OfferBuildError(`Could not select coins for ${label}`, { cause: error });
  }

  return selected.map((coin) => {
    const found = byId.get(bytesToHex(coin.coinId()));
    if (!found) {
      throw new OfferBuildError(`Coin selection returned an unknown coin for ${label}`);
    }
    return found;
  });
}

/** Adds a prepared coin to a `Spends` builder as XCH or as a CAT. */
export function addPreparedCoin(
  driver: ChiaOfferDriver,
  spends: InstanceType<ChiaOfferDriver["Spends"]>,
  prepared: PreparedCoin
): void {
  if (prepared.assetId === null) {
    spends.addXch(prepared.coin);
    return;
  }

  const proof = prepared.input.lineageProof;
  if (!proof?.parentName || !proof.innerPuzzleHash) {
    throw new OfferBuildError(
      `CAT coin ${prepared.coinId} is missing a lineage proof; it cannot be spent`
    );
  }

  const info = new driver.CatInfo(
    hexToBytes(prepared.assetId),
    prepared.hiddenPuzzleHash ? hexToBytes(prepared.hiddenPuzzleHash) : undefined,
    hexToBytes(prepared.p2PuzzleHash)
  );
  const lineageProof = new driver.LineageProof(
    hexToBytes(proof.parentName, "lineageProof.parentName"),
    hexToBytes(proof.innerPuzzleHash, "lineageProof.innerPuzzleHash"),
    toMojos(proof.amount, "lineageProof.amount")
  );
  spends.addCat(new driver.Cat(prepared.coin, lineageProof, info));
}

/**
 * Runs the action system to completion, filling in the standard spend for every coin the
 * wallet controls, and returns the resulting coin spends.
 *
 * Two things happen here that the WASM bindings do not do for us:
 *
 * 1. **Signing hook.** `FinishedSpends.pendingSpends()` hands back the conditions the
 *    action system wants each p2 coin to emit; the caller has to wrap them in a puzzle.
 *    We build `standardSpend(syntheticKey, delegatedSpend(conditions))`, recovering the
 *    key from the coin's own puzzle reveal.
 * 2. **Concurrency relation.** `Spends::prepare` is called with `Relation::None` inside
 *    the bindings, so multi-coin spends are not tied together. Required conditions (such
 *    as an offer's requested-payment assertions) land on a single spend, which would let
 *    a third party drop the other spends and still submit a valid — but smaller — bundle.
 *    We re-create upstream's `Relation::AssertConcurrent` by adding a ring of
 *    `ASSERT_CONCURRENT_SPEND` conditions, which is also what offers produced by Sage and
 *    the reference wallet contain.
 */
export function finishSpends(
  driver: ChiaOfferDriver,
  clvm: InstanceType<ChiaOfferDriver["Clvm"]>,
  spends: InstanceType<ChiaOfferDriver["Spends"]>,
  actions: InstanceType<ChiaOfferDriver["Action"]>[],
  syntheticKeysByP2Hash: Map<string, string>
): OfferCoinSpend[] {
  let deltas: InstanceType<ChiaOfferDriver["Deltas"]>;
  try {
    deltas = spends.apply(actions);
  } catch (error) {
    throw new OfferBuildError(`Could not apply the offer actions: ${describe(error)}`, {
      cause: error,
    });
  }

  let finished: InstanceType<ChiaOfferDriver["FinishedSpends"]>;
  try {
    finished = spends.prepare(deltas);
  } catch (error) {
    throw new OfferBuildError(`Could not prepare the offer spends: ${describe(error)}`, {
      cause: error,
    });
  }

  const pending = finished.pendingSpends();
  const coinIds = pending.map((spend) => spend.coin().coinId());

  pending.forEach((spend, index) => {
    const conditions = spend.conditions();
    if (pending.length > 1) {
      const previous = index === 0 ? coinIds[coinIds.length - 1] : coinIds[index - 1];
      conditions.push(clvm.assertConcurrentSpend(previous));
    }

    const p2PuzzleHash = bytesToHex(spend.p2PuzzleHash());
    const syntheticKey = syntheticKeysByP2Hash.get(p2PuzzleHash);
    if (!syntheticKey) {
      throw new OfferBuildError(
        `No synthetic public key for puzzle hash ${p2PuzzleHash}. The action system needed an ` +
          "intermediate coin at that address; pass a coin controlled by it, or supply the key " +
          "through additionalSyntheticKeys."
      );
    }

    const inner = clvm.standardSpend(
      driver.PublicKey.fromBytes(hexToBytes(syntheticKey)),
      clvm.delegatedSpend(conditions)
    );
    finished.insert(coinIds[index], inner);
  });

  try {
    finished.spend();
  } catch (error) {
    throw new OfferBuildError(`Could not finalise the offer spends: ${describe(error)}`, {
      cause: error,
    });
  }

  return clvm.coinSpends().map(toOfferCoinSpend);
}

/** Converts a driver `CoinSpend` into the bridge/CHIP-0002 JSON shape. */
export function toOfferCoinSpend(
  coinSpend: InstanceType<ChiaOfferDriver["CoinSpend"]>
): OfferCoinSpend {
  return {
    coin: {
      parent_coin_info: bytesToHex(coinSpend.coin.parentCoinInfo),
      puzzle_hash: bytesToHex(coinSpend.coin.puzzleHash),
      amount: coinSpend.coin.amount.toString(),
    },
    puzzle_reveal: bytesToHex(coinSpend.puzzleReveal),
    solution: bytesToHex(coinSpend.solution),
  };
}

/** Converts a bridge/CHIP-0002 coin spend back into a driver `CoinSpend`. */
export function toDriverCoinSpend(
  driver: ChiaOfferDriver,
  coinSpend: OfferCoinSpend
): InstanceType<ChiaOfferDriver["CoinSpend"]> {
  return new driver.CoinSpend(
    new driver.Coin(
      hexToBytes(coinSpend.coin.parent_coin_info, "parent_coin_info"),
      hexToBytes(coinSpend.coin.puzzle_hash, "puzzle_hash"),
      toMojos(coinSpend.coin.amount, "coin amount")
    ),
    hexToBytes(coinSpend.puzzle_reveal, "puzzle_reveal"),
    hexToBytes(coinSpend.solution, "solution")
  );
}

/** Builds a driver `SpendBundle` from bridge-shaped spends and an aggregated signature. */
export function toDriverSpendBundle(
  driver: ChiaOfferDriver,
  bundle: OfferSpendBundle
): InstanceType<ChiaOfferDriver["SpendBundle"]> {
  return new driver.SpendBundle(
    bundle.coin_spends.map((coinSpend) => toDriverCoinSpend(driver, coinSpend)),
    driver.Signature.fromBytes(hexToBytes(bundle.aggregated_signature, "aggregated_signature"))
  );
}

/**
 * The settlement puzzle hash the taker must pay into for an asset.
 *
 * XCH uses the bare settlement payments puzzle; a CAT wraps it in the CAT layer, so the
 * hash differs per asset id.
 */
export function settlementPuzzleHashFor(driver: ChiaOfferDriver, assetId: string | null): string {
  const settlement = driver.Constants.settlementPaymentHash();
  if (assetId === null) return bytesToHex(settlement);
  return bytesToHex(driver.catPuzzleHash(hexToBytes(assetId), settlement));
}

/**
 * Builds the puzzle reveal for a requested-payment placeholder spend.
 *
 * Mirrors `Offer::to_spend_bundle` in `chia-sdk-driver`: XCH placeholders reveal the bare
 * settlement payments puzzle, CAT placeholders reveal the CAT layer curried around it.
 */
export function settlementPuzzleFor(
  driver: ChiaOfferDriver,
  clvm: InstanceType<ChiaOfferDriver["Clvm"]>,
  assetId: string | null
): InstanceType<ChiaOfferDriver["Program"]> {
  const settlement = clvm.settlementPayment();
  if (assetId === null) return settlement;
  return clvm
    .deserialize(driver.Constants.catPuzzle())
    .curry([
      clvm.atom(driver.Constants.catPuzzleHash()),
      clvm.atom(hexToBytes(assetId)),
      settlement,
    ]);
}

/**
 * The nonce for a notarized payment: the CLVM tree hash of the sorted coin ids the
 * payment is notarised against.
 *
 * Equivalent to `Offer::nonce` in `chia-sdk-driver`
 * (`coin_ids.sort(); coin_ids.tree_hash()`), which the WASM bindings do not expose. Coin
 * ids are sorted byte-wise ascending and hashed as a proper CLVM list of atoms.
 */
export function notarizedPaymentNonce(driver: ChiaOfferDriver, coinIds: string[]): string {
  const sorted = [...coinIds]
    .map((id) => hexToBytes(id, "coin id"))
    .sort(compareBytes)
    .reverse();

  let hash = driver.treeHashAtom(new Uint8Array());
  for (const coinId of sorted) {
    hash = driver.treeHashPair(driver.treeHashAtom(coinId), hash);
  }
  return bytesToHex(hash);
}

function compareBytes(left: Uint8Array, right: Uint8Array): number {
  const shared = Math.min(left.length, right.length);
  const index = Array.from({ length: shared }).findIndex((_, i) => left[i] !== right[i]);
  return index === -1 ? left.length - right.length : left[index] - right[index];
}

/**
 * The `ASSERT_PUZZLE_ANNOUNCEMENT` id that proves a notarized payment was made.
 *
 * `announcement_id = sha256(settlement puzzle hash || tree hash of the notarized payment)`,
 * matching `payment_assertion` in `chia-sdk-types`.
 */
export function paymentAssertionId(
  driver: ChiaOfferDriver,
  clvm: InstanceType<ChiaOfferDriver["Clvm"]>,
  settlementPuzzleHash: string,
  notarizedPayment: InstanceType<ChiaOfferDriver["NotarizedPayment"]>
): Uint8Array {
  const puzzleHash = hexToBytes(settlementPuzzleHash);
  const paymentHash = clvm.alloc(notarizedPayment).treeHash();
  const message = new Uint8Array(puzzleHash.length + paymentHash.length);
  message.set(puzzleHash, 0);
  message.set(paymentHash, puzzleHash.length);
  return driver.sha256(message);
}

/** The `ASSERT_PUZZLE_ANNOUNCEMENT` condition opcode, exported for condition inspection. */
export const ASSERT_PUZZLE_ANNOUNCEMENT = CONDITION_ASSERT_PUZZLE_ANNOUNCEMENT;

/** Maximum CLVM cost used when running a puzzle to inspect its output conditions. */
export const PUZZLE_INSPECTION_MAX_COST = MAX_CLVM_COST;

export function describe(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return String(error);
}

/** A memo list holding the receiver's puzzle hash, so the payment coin is discoverable. */
export function hintMemos(
  clvm: InstanceType<ChiaOfferDriver["Clvm"]>,
  puzzleHash: string
): InstanceType<ChiaOfferDriver["Program"]> {
  return clvm.alloc([hexToBytes(puzzleHash, "puzzle hash")]);
}
