/**
 * Test-only helpers around the Chia driver.
 *
 * Unit tests instantiate the WebAssembly module from `node_modules` rather than fetching
 * it over HTTP, and they sign with real BLS keys so the assembled bundles can be verified
 * end to end instead of only inspected structurally.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { loadChiaOfferDriver, type ChiaOfferDriver } from "../driver";
import type { AssetCoinInput, OfferCoinSpend, SignCoinSpendsFn } from "../types";

/** Genesis challenge of testnet11, the `AGG_SIG_ME` additional data used by the tests. */
export const TESTNET11_GENESIS_CHALLENGE =
  "37a90eb5185a9c4439a91ddc98bbadce7b4feba060d50116a067de66bf236615";

/** Genesis challenge of mainnet. */
export const MAINNET_GENESIS_CHALLENGE =
  "ccd5bb71183532bff220ba46c268991a3ff07eb358e8255a65c30a2dce0e5fbb";

const MAX_COST = BigInt("11000000000");

/** Loads the driver from the wasm binary shipped in `node_modules`. */
export function loadTestDriver(): Promise<ChiaOfferDriver> {
  const require = createRequire(import.meta.url);
  const wasmPath = require.resolve("chia-wallet-sdk-wasm/chia_wallet_sdk_wasm_bg.wasm");
  return loadChiaOfferDriver(readFileSync(wasmPath));
}

function toHex(bytes: Uint8Array): string {
  let hex = "";
  for (const byte of bytes) hex += byte.toString(16).padStart(2, "0");
  return hex;
}

function fromHex(value: string): Uint8Array {
  return Uint8Array.from(value.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16));
}

/** A deterministic fake wallet: one synthetic key, plus coin and signing helpers. */
export interface TestWallet {
  /** Synthetic public key, hex. */
  publicKey: string;
  /** Standard puzzle hash for the synthetic key, hex. Used as the change address. */
  puzzleHash: string;
  /** Builds an XCH coin owned by this wallet, in `wallet.getAssetCoins` shape. */
  xchCoin(amount: string, seed?: number): AssetCoinInput;
  /** Builds a CAT coin owned by this wallet, with a synthetic lineage proof. */
  catCoin(assetId: string, amount: string, seed?: number): AssetCoinInput;
  /** A `signCoinSpends` implementation backed by the wallet's real secret key. */
  sign: SignCoinSpendsFn;
}

/**
 * Builds a deterministic test wallet.
 *
 * @param driver - the loaded driver.
 * @param seed - fills the 32 byte master seed, so different values give different keys.
 * @param genesisChallenge - `AGG_SIG_ME` additional data. Defaults to testnet11.
 */
export function createTestWallet(
  driver: ChiaOfferDriver,
  seed: number,
  genesisChallenge: string = TESTNET11_GENESIS_CHALLENGE
): TestWallet {
  const secretKey = driver.SecretKey.fromSeed(new Uint8Array(32).fill(seed)).deriveSynthetic();
  const publicKey = secretKey.publicKey();
  const puzzleHash = toHex(driver.standardPuzzleHash(publicKey));
  const publicKeyHex = toHex(publicKey.toBytes());
  const challenge = fromHex(genesisChallenge);

  const clvm = new driver.Clvm();
  const standardPuzzle = toHex(
    clvm.standardSpend(publicKey, clvm.delegatedSpend([])).puzzle.serialize()
  );

  function catPuzzleReveal(assetId: string): string {
    const inner = clvm.deserialize(fromHex(standardPuzzle));
    return toHex(
      clvm
        .deserialize(driver.Constants.catPuzzle())
        .curry([clvm.atom(driver.Constants.catPuzzleHash()), clvm.atom(fromHex(assetId)), inner])
        .serialize()
    );
  }

  return {
    publicKey: publicKeyHex,
    puzzleHash,

    xchCoin(amount, coinSeed = 7) {
      const coin = new driver.Coin(
        new Uint8Array(32).fill(coinSeed),
        fromHex(puzzleHash),
        BigInt(amount)
      );
      return {
        coin: {
          parent_coin_info: toHex(coin.parentCoinInfo),
          puzzle_hash: toHex(coin.puzzleHash),
          amount,
        },
        coinName: toHex(coin.coinId()),
        puzzle: standardPuzzle,
        confirmedBlockIndex: 1,
        locked: false,
        lineageProof: null,
      };
    },

    catCoin(assetId, amount, coinSeed = 9) {
      const info = new driver.CatInfo(fromHex(assetId), undefined, fromHex(puzzleHash));

      // The CAT puzzle re-derives the parent coin id from the lineage proof and raises if
      // it does not match, so the fixture has to build a consistent three-generation
      // lineage: grandparent -> parent (same CAT puzzle hash) -> this coin.
      const grandparentId = new Uint8Array(32).fill(coinSeed + 100);
      const parent = new driver.Coin(grandparentId, info.puzzleHash(), BigInt(amount));
      const coin = new driver.Coin(parent.coinId(), info.puzzleHash(), BigInt(amount));

      return {
        coin: {
          parent_coin_info: toHex(coin.parentCoinInfo),
          puzzle_hash: toHex(coin.puzzleHash),
          amount,
        },
        coinName: toHex(coin.coinId()),
        puzzle: catPuzzleReveal(assetId),
        confirmedBlockIndex: 1,
        locked: false,
        lineageProof: {
          parentName: toHex(grandparentId),
          innerPuzzleHash: puzzleHash,
          amount,
        },
      };
    },

    sign(coinSpends, { partialSign }) {
      const signatures = [];
      for (const required of requiredSignatures(driver, coinSpends, challenge)) {
        if (required.publicKey !== publicKeyHex) {
          if (partialSign) continue;
          throw new Error(`Test wallet cannot sign for ${required.publicKey}`);
        }
        signatures.push(secretKey.sign(required.message));
      }
      return Promise.resolve(toHex(driver.Signature.aggregate(signatures).toBytes()));
    },
  };
}

/** One `AGG_SIG_ME` obligation extracted from a coin spend. */
export interface RequiredSignature {
  publicKey: string;
  /** The exact bytes to sign: condition message, coin id, genesis challenge. */
  message: Uint8Array;
}

/**
 * Collects the `AGG_SIG_ME` obligations of a set of coin spends.
 *
 * Mirrors Sage's `sign_transaction`, including skipping spends whose parent coin id is
 * all zeroes (the requested-payment placeholders of an offer, which never run on chain).
 */
export function requiredSignatures(
  driver: ChiaOfferDriver,
  coinSpends: OfferCoinSpend[],
  genesisChallenge: Uint8Array
): RequiredSignature[] {
  const clvm = new driver.Clvm();
  const required: RequiredSignature[] = [];

  for (const coinSpend of coinSpends) {
    if (/^(0x)?0{64}$/i.test(coinSpend.coin.parent_coin_info)) continue;

    const coin = new driver.Coin(
      fromHex(coinSpend.coin.parent_coin_info),
      fromHex(coinSpend.coin.puzzle_hash),
      BigInt(coinSpend.coin.amount)
    );
    const output = clvm
      .deserialize(fromHex(coinSpend.puzzle_reveal))
      .run(clvm.deserialize(fromHex(coinSpend.solution)), MAX_COST, false);

    for (const condition of output.value.toList() ?? []) {
      const aggSigMe = condition.parseAggSigMe();
      if (!aggSigMe) continue;
      const coinId = coin.coinId();
      const message = new Uint8Array(
        aggSigMe.message.length + coinId.length + genesisChallenge.length
      );
      message.set(aggSigMe.message, 0);
      message.set(coinId, aggSigMe.message.length);
      message.set(genesisChallenge, aggSigMe.message.length + coinId.length);
      required.push({ publicKey: toHex(aggSigMe.publicKey.toBytes()), message });
    }
  }

  return required;
}

/**
 * Verifies that a bundle's aggregated signature satisfies every `AGG_SIG_ME` condition
 * its coin spends emit. This is the check a full node performs before accepting a bundle.
 */
export function verifyAggregatedSignature(
  driver: ChiaOfferDriver,
  coinSpends: OfferCoinSpend[],
  aggregatedSignature: string,
  genesisChallenge: string = TESTNET11_GENESIS_CHALLENGE
): boolean {
  const required = requiredSignatures(driver, coinSpends, fromHex(genesisChallenge));
  const signature = driver.Signature.fromBytes(fromHex(aggregatedSignature));
  if (required.length === 0) return signature.isInfinity();

  return driver.PublicKey.aggregateVerify(
    required.map((entry) => driver.PublicKey.fromBytes(fromHex(entry.publicKey))),
    required.map((entry) => entry.message),
    signature
  );
}

export { toHex as bytesToHex, fromHex as hexToBytes };

/** A condition a bundle emits but nothing in the bundle satisfies. */
export interface UnsatisfiedAssertion {
  kind: "coin-announcement" | "puzzle-announcement" | "concurrent-spend";
  /** The announcement id, or the coin id for a concurrent-spend assertion. */
  id: string;
}

/**
 * Checks the announcement and concurrency assertions of a spend bundle the way the
 * mempool does: every `ASSERT_*_ANNOUNCEMENT` must be matched by a `CREATE_*_ANNOUNCEMENT`
 * somewhere in the same bundle, and every `ASSERT_CONCURRENT_SPEND` must name a coin the
 * bundle spends.
 *
 * For an offer this is the test that matters: the maker's requested-payment assertion is
 * only satisfied if the taker spends a settlement coin with exactly the maker's notarized
 * payment.
 *
 * @returns the assertions nothing satisfied. An empty array means the bundle is coherent.
 */
export function findUnsatisfiedAssertions(
  driver: ChiaOfferDriver,
  coinSpends: OfferCoinSpend[]
): UnsatisfiedAssertion[] {
  const clvm = new driver.Clvm();
  const createdCoinAnnouncements = new Set<string>();
  const createdPuzzleAnnouncements = new Set<string>();
  const spentCoinIds = new Set<string>();
  const assertions: UnsatisfiedAssertion[] = [];

  for (const coinSpend of coinSpends) {
    if (/^(0x)?0{64}$/i.test(coinSpend.coin.parent_coin_info)) continue;

    const coin = new driver.Coin(
      fromHex(coinSpend.coin.parent_coin_info),
      fromHex(coinSpend.coin.puzzle_hash),
      BigInt(coinSpend.coin.amount)
    );
    spentCoinIds.add(toHex(coin.coinId()));

    const output = clvm
      .deserialize(fromHex(coinSpend.puzzle_reveal))
      .run(clvm.deserialize(fromHex(coinSpend.solution)), MAX_COST, false);

    for (const condition of output.value.toList() ?? []) {
      const coinAnnouncement = condition.parseCreateCoinAnnouncement();
      if (coinAnnouncement) {
        createdCoinAnnouncements.add(
          toHex(announcementId(driver, coin.coinId(), coinAnnouncement.message))
        );
        continue;
      }
      const puzzleAnnouncement = condition.parseCreatePuzzleAnnouncement();
      if (puzzleAnnouncement) {
        createdPuzzleAnnouncements.add(
          toHex(announcementId(driver, coin.puzzleHash, puzzleAnnouncement.message))
        );
        continue;
      }
      const assertCoin = condition.parseAssertCoinAnnouncement();
      if (assertCoin) {
        assertions.push({ kind: "coin-announcement", id: toHex(assertCoin.announcementId) });
        continue;
      }
      const assertPuzzle = condition.parseAssertPuzzleAnnouncement();
      if (assertPuzzle) {
        assertions.push({ kind: "puzzle-announcement", id: toHex(assertPuzzle.announcementId) });
        continue;
      }
      const assertConcurrent = condition.parseAssertConcurrentSpend();
      if (assertConcurrent) {
        assertions.push({ kind: "concurrent-spend", id: toHex(assertConcurrent.coinId) });
      }
    }
  }

  return assertions.filter((assertion) => {
    if (assertion.kind === "coin-announcement") return !createdCoinAnnouncements.has(assertion.id);
    if (assertion.kind === "puzzle-announcement") {
      return !createdPuzzleAnnouncements.has(assertion.id);
    }
    return !spentCoinIds.has(assertion.id);
  });
}

function announcementId(
  driver: ChiaOfferDriver,
  prefix: Uint8Array,
  message: Uint8Array
): Uint8Array {
  const buffer = new Uint8Array(prefix.length + message.length);
  buffer.set(prefix, 0);
  buffer.set(message, prefix.length);
  return driver.sha256(buffer);
}
