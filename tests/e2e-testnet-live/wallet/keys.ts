/**
 * Real keys for the live testnet wallet peer, derived from `TESTNET_WALLET_MNEMONIC`.
 *
 * Standard Chia derivation: master key from the BIP-39 seed (empty passphrase),
 * wallet key at m/12381/8444/2/<index> (unhardened), synthetic key with the
 * default hidden puzzle, standard puzzle hash → bech32m address. Index 0 is the
 * wallet's only address: the faucet funded it and every change output returns to it,
 * which keeps coin lookups to one puzzle hash.
 *
 * Signing mirrors how Sage signs: one BLS signature per `AGG_SIG_ME`, message =
 * condition message || coin id || genesis challenge, aggregated into the bundle
 * signature (see {@link requiredSignatures}).
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { loadChiaOfferDriver, type ChiaOfferDriver } from "../../../src/shared/lib/wallet/offers/driver";
import type {
  OfferCoinSpend,
  OfferSpendBundle,
  SignCoinSpendsFn,
} from "../../../src/shared/lib/wallet/offers/types";

/** Genesis challenge of testnet11 — the `AGG_SIG_ME` additional data. */
export const TESTNET11_GENESIS_CHALLENGE =
  "37a90eb5185a9c4439a91ddc98bbadce7b4feba060d50116a067de66bf236615";

const MAX_CLVM_COST = BigInt("11000000000");

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function hexToBytes(value: string): Uint8Array {
  return Uint8Array.from(strip0x(value).match(/../g) ?? [], (pair) => Number.parseInt(pair, 16));
}

/**
 * Loads the wasm driver from `node_modules`. Resolved from the project root rather
 * than `import.meta.url` so the file works however Playwright loads it (CJS or ESM).
 */
export function loadNodeDriver(): Promise<ChiaOfferDriver> {
  const require = createRequire(join(process.cwd(), "package.json"));
  const wasmPath = require.resolve("chia-wallet-sdk-wasm/chia_wallet_sdk_wasm_bg.wasm");
  return loadChiaOfferDriver(readFileSync(wasmPath));
}

/** One `AGG_SIG_ME` obligation of a coin spend: who has to sign which bytes. */
export interface RequiredSignature {
  publicKey: string;
  message: Uint8Array;
}

/**
 * Collects the `AGG_SIG_ME` obligations of a set of coin spends the way Sage's
 * `sign_transaction` does (message || coin id || genesis challenge), skipping the
 * all-zero-parent placeholder spends of an offer. Mirrors
 * `src/shared/lib/wallet/offers/__fixtures__/testDriver.ts`, which cannot be imported
 * here because it relies on `import.meta.url`.
 */
export function requiredSignatures(
  driver: ChiaOfferDriver,
  coinSpends: OfferCoinSpend[],
  genesisChallenge: Uint8Array
): RequiredSignature[] {
  const clvm = new driver.Clvm();
  return coinSpends
    .filter((spend) => !/^(0x)?0{64}$/i.test(spend.coin.parent_coin_info))
    .flatMap((spend) => {
      const coinId = toDriverCoin(driver, spend).coinId();
      const output = clvm
        .deserialize(hexToBytes(spend.puzzle_reveal))
        .run(clvm.deserialize(hexToBytes(spend.solution)), MAX_CLVM_COST, false);
      return (output.value.toList() ?? []).flatMap((condition) => {
        const aggSigMe = condition.parseAggSigMe();
        if (!aggSigMe) return [];
        const message = new Uint8Array(
          aggSigMe.message.length + coinId.length + genesisChallenge.length
        );
        message.set(aggSigMe.message, 0);
        message.set(coinId, aggSigMe.message.length);
        message.set(genesisChallenge, aggSigMe.message.length + coinId.length);
        return [{ publicKey: bytesToHex(aggSigMe.publicKey.toBytes()), message }];
      });
    });
}

/** m/12381/8444/2/0 — the first unhardened wallet key. */
export const WALLET_DERIVATION_PATH = [12381, 8444, 2, 0];

export interface LiveWalletKeys {
  driver: ChiaOfferDriver;
  fingerprint: number;
  /** Master public key, hex. */
  masterPublicKey: string;
  /** Synthetic public key of the wallet key, hex — what `AGG_SIG_ME` conditions name. */
  syntheticPublicKey: string;
  /** Standard puzzle hash of the synthetic key, hex (no 0x). */
  puzzleHash: string;
  /** bech32m address for {@link puzzleHash} with the given prefix (`txch`). */
  address: string;
  /** Serialised standard puzzle reveal for the synthetic key, hex. */
  standardPuzzleReveal: string;
  /** Signs every `AGG_SIG_ME` the spends emit for this key. */
  sign: SignCoinSpendsFn;
  /** Raw BLS signature over arbitrary bytes, hex. */
  signMessage(message: Uint8Array): string;
}

export async function deriveLiveWalletKeys(
  mnemonic: string,
  prefix = "txch",
  genesisChallenge: string = TESTNET11_GENESIS_CHALLENGE
): Promise<LiveWalletKeys> {
  const driver = await loadNodeDriver();
  const words = mnemonic.trim().replace(/\s+/g, " ");
  if (!driver.Mnemonic.verify(words)) {
    throw new Error("TESTNET_WALLET_MNEMONIC is not a valid BIP-39 mnemonic");
  }

  const seed = new driver.Mnemonic(words).toSeed("");
  const master = driver.SecretKey.fromSeed(seed);
  const masterPublicKey = master.publicKey();
  const syntheticSecretKey = master.deriveUnhardenedPath(WALLET_DERIVATION_PATH).deriveSynthetic();
  const syntheticPublicKey = syntheticSecretKey.publicKey();
  const syntheticPublicKeyHex = bytesToHex(syntheticPublicKey.toBytes());
  const puzzleHashBytes = driver.standardPuzzleHash(syntheticPublicKey);
  const clvm = new driver.Clvm();
  const standardPuzzleReveal = bytesToHex(
    clvm.standardSpend(syntheticPublicKey, clvm.delegatedSpend([])).puzzle.serialize()
  );
  const challenge = hexToBytes(genesisChallenge);

  return {
    driver,
    fingerprint: masterPublicKey.fingerprint(),
    masterPublicKey: bytesToHex(masterPublicKey.toBytes()),
    syntheticPublicKey: syntheticPublicKeyHex,
    puzzleHash: bytesToHex(puzzleHashBytes),
    address: new driver.Address(puzzleHashBytes, prefix).encode(),
    standardPuzzleReveal,

    sign(coinSpends, { partialSign }) {
      const signatures = [];
      for (const required of requiredSignatures(driver, coinSpends, challenge)) {
        if (required.publicKey !== syntheticPublicKeyHex) {
          if (partialSign) continue;
          throw new Error(`Live wallet cannot sign for public key ${required.publicKey}`);
        }
        signatures.push(syntheticSecretKey.sign(required.message));
      }
      if (signatures.length === 0) {
        throw new Error("Nothing to sign: the spends emit no AGG_SIG_ME for this wallet");
      }
      return Promise.resolve(bytesToHex(driver.Signature.aggregate(signatures).toBytes()));
    },

    signMessage(message) {
      return bytesToHex(syntheticSecretKey.sign(message).toBytes());
    },
  };
}

/** The bundle's transaction id (its tree hash), as a full node's mempool names it. */
export function spendBundleId(driver: ChiaOfferDriver, bundle: OfferSpendBundle): string {
  const coinSpends = bundle.coin_spends.map(
    (spend) =>
      new driver.CoinSpend(
        toDriverCoin(driver, spend),
        hexToBytes(spend.puzzle_reveal),
        hexToBytes(spend.solution)
      )
  );
  const signature = driver.Signature.fromBytes(hexToBytes(bundle.aggregated_signature));
  return bytesToHex(new driver.SpendBundle(coinSpends, signature).hash());
}

export function toDriverCoin(driver: ChiaOfferDriver, spend: OfferCoinSpend) {
  return new driver.Coin(
    hexToBytes(strip0x(spend.coin.parent_coin_info)),
    hexToBytes(strip0x(spend.coin.puzzle_hash)),
    BigInt(spend.coin.amount)
  );
}

export function coinIdOf(driver: ChiaOfferDriver, spend: OfferCoinSpend): string {
  return bytesToHex(toDriverCoin(driver, spend).coinId());
}

export function strip0x(value: string): string {
  return value.replace(/^0x/i, "").toLowerCase();
}
