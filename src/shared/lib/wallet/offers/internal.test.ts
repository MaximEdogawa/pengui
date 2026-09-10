import { beforeAll, describe, expect, it } from "bun:test";
import type { ChiaOfferDriver } from "./driver";
import {
  addPreparedCoin,
  hexToBytes,
  normaliseAssetId,
  notarizedPaymentNonce,
  OfferBuildError,
  prepareCoins,
  settlementPuzzleHashFor,
  toMojos,
} from "./internal";
import { parseOffer } from "./parseOffer";
import { createTestWallet, loadTestDriver, type TestWallet } from "./__fixtures__/testDriver";
import {
  DEXIE_MAINNET_CAT_FOR_XCH_OFFER,
  DEXIE_MAINNET_XCH_FOR_CAT_OFFER,
  DEXIE_TESTNET_XCH_FOR_CAT_OFFER,
} from "./__fixtures__/offers";

/** The well-known settlement payments puzzle hash, the anchor of the whole offer format. */
const SETTLEMENT_PAYMENT_HASH = "cfbfdeed5c4ca2de3d0bf520b9cb4bb7743a359bd2e6a188d19ce7dffc21d3e7";

const CAT_ID = "ccda69ff6c44d687994efdbee30689be51d2347f739287ab4bb7b52344f8bf1d";

describe("amount and hex parsing", () => {
  it("accepts decimal strings, safe numbers and bigints", () => {
    expect(toMojos("1000000000000", "x")).toBe(BigInt("1000000000000"));
    expect(toMojos(1000, "x")).toBe(BigInt(1000));
    expect(toMojos(BigInt(5), "x")).toBe(BigInt(5));
    expect(toMojos(null, "x")).toBe(BigInt(0));
  });

  it("refuses number amounts that would lose precision", () => {
    expect(() => toMojos(Number.MAX_SAFE_INTEGER + 2, "amount")).toThrow(
      /exceeds Number.MAX_SAFE_INTEGER/
    );
    expect(() => toMojos(1.5, "amount")).toThrow(/whole number/);
    expect(() => toMojos("1.5", "amount")).toThrow(/decimal mojo amount/);
    expect(() => toMojos("-1", "amount")).toThrow(OfferBuildError);
  });

  it("parses hex with or without a 0x prefix and rejects anything else", () => {
    expect(hexToBytes("0xff00")).toEqual(new Uint8Array([255, 0]));
    expect(hexToBytes("ff00")).toEqual(new Uint8Array([255, 0]));
    expect(() => hexToBytes("zz")).toThrow(OfferBuildError);
    expect(() => hexToBytes("abc")).toThrow(OfferBuildError);
  });

  it("treats XCH as the absence of an asset id", () => {
    expect(normaliseAssetId(null)).toBeNull();
    expect(normaliseAssetId("")).toBeNull();
    expect(normaliseAssetId("xch")).toBeNull();
    expect(normaliseAssetId(`0x${CAT_ID.toUpperCase()}`)).toBe(CAT_ID);
    expect(() => normaliseAssetId("dead")).toThrow(/32 byte CAT asset id/);
  });
});

describe("settlement puzzle hashes", () => {
  let driver: ChiaOfferDriver;

  beforeAll(async () => {
    driver = await loadTestDriver();
  });

  it("uses the canonical settlement payments puzzle for XCH", () => {
    expect(settlementPuzzleHashFor(driver, null)).toBe(SETTLEMENT_PAYMENT_HASH);
  });

  it("wraps the settlement puzzle in the CAT layer for a CAT", () => {
    const hash = settlementPuzzleHashFor(driver, CAT_ID);
    expect(hash).not.toBe(SETTLEMENT_PAYMENT_HASH);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    // Matches the placeholder coin of the real mainnet offer requesting this CAT.
    const parsed = parseOffer(driver, DEXIE_MAINNET_XCH_FOR_CAT_OFFER);
    expect(parsed.requestedPayments[0].settlementPuzzleHash).toBe(hash);
  });
});

describe("notarizedPaymentNonce", () => {
  let driver: ChiaOfferDriver;

  beforeAll(async () => {
    driver = await loadTestDriver();
  });

  function cancelCoinIds(offer: string): string[] {
    return parseOffer(driver, offer).cancellableCoinSpends.map((coinSpend) => {
      const coin = new driver.Coin(
        hexToBytes(coinSpend.coin.parent_coin_info),
        hexToBytes(coinSpend.coin.puzzle_hash),
        BigInt(coinSpend.coin.amount)
      );
      return [...coin.coinId()].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    });
  }

  function actualNonce(offer: string): string {
    return parseOffer(driver, offer).requestedPayments[0].notarizedPayments[0].nonce;
  }

  it("reproduces the nonce of real offers made by chia-wallet-sdk wallets", () => {
    // Both were produced by a wallet using `Offer::nonce` (the tree hash of the sorted
    // coin ids), which is the convention Sage and this module follow.
    for (const offer of [DEXIE_TESTNET_XCH_FOR_CAT_OFFER, DEXIE_MAINNET_CAT_FOR_XCH_OFFER]) {
      expect(notarizedPaymentNonce(driver, cancelCoinIds(offer))).toBe(actualNonce(offer));
    }
  });

  it("is order independent", () => {
    const ids = cancelCoinIds(DEXIE_TESTNET_XCH_FOR_CAT_OFFER);
    expect(notarizedPaymentNonce(driver, ids)).toBe(
      notarizedPaymentNonce(driver, [...ids].reverse())
    );
  });

  it("does not match the chia-blockchain reference wallet's different convention", () => {
    // The reference wallet hashes `[[parent, puzzle_hash, amount], ...]` instead of the
    // coin ids. Both are valid: the nonce is opaque, it only has to be identical in the
    // maker's assertion and in the placeholder solution of the same offer.
    const offer = DEXIE_MAINNET_XCH_FOR_CAT_OFFER;
    expect(notarizedPaymentNonce(driver, cancelCoinIds(offer))).not.toBe(actualNonce(offer));
  });
});

describe("prepareCoins", () => {
  let driver: ChiaOfferDriver;
  let wallet: TestWallet;

  beforeAll(async () => {
    driver = await loadTestDriver();
    wallet = createTestWallet(driver, 6);
  });

  it("recovers the asset id and synthetic key from the puzzle reveal", () => {
    const clvm = new driver.Clvm();
    const [xch, cat] = prepareCoins(driver, clvm, [
      wallet.xchCoin("1000"),
      wallet.catCoin(CAT_ID, "2000"),
    ]);

    expect(xch.assetId).toBeNull();
    expect(xch.p2PuzzleHash).toBe(wallet.puzzleHash);
    expect(xch.syntheticKey).toBe(wallet.publicKey);
    expect(cat.assetId).toBe(CAT_ID);
    expect(cat.syntheticKey).toBe(wallet.publicKey);
    expect(cat.hiddenPuzzleHash).toBeNull();
  });

  it("skips locked coins by default and keeps them on request", () => {
    const clvm = new driver.Clvm();
    const locked = { ...wallet.xchCoin("1000"), locked: true };

    expect(prepareCoins(driver, clvm, [locked])).toHaveLength(0);
    expect(prepareCoins(driver, clvm, [locked], { skipLocked: false })).toHaveLength(1);
  });

  it("rejects a coin whose reported id does not match its contents", () => {
    const clvm = new driver.Clvm();
    const coin = { ...wallet.xchCoin("1000"), coinName: "11".repeat(32) };
    expect(() => prepareCoins(driver, clvm, [coin])).toThrow(/Coin id mismatch/);
  });

  it("rejects a coin whose puzzle reveal does not hash to its puzzle hash", () => {
    const clvm = new driver.Clvm();
    const other = createTestWallet(driver, 7);
    const coin = wallet.xchCoin("1000");
    const tampered = { ...coin, puzzle: other.xchCoin("1000").puzzle, coinName: undefined };
    expect(() => prepareCoins(driver, clvm, [tampered])).toThrow(/does not hash/);
  });

  it("rejects a coin without a puzzle reveal", () => {
    const clvm = new driver.Clvm();
    const coin = { ...wallet.xchCoin("1000"), puzzle: "" };
    expect(() => prepareCoins(driver, clvm, [coin])).toThrow(/no puzzle reveal/);
  });

  it("rejects a CAT coin without a lineage proof when it is spent", () => {
    const clvm = new driver.Clvm();
    const coin = { ...wallet.catCoin(CAT_ID, "2000"), lineageProof: null };
    const [prepared] = prepareCoins(driver, clvm, [coin]);
    const spends = new driver.Spends(clvm, hexToBytes(wallet.puzzleHash));

    expect(() => addPreparedCoin(driver, spends, prepared)).toThrow(/missing a lineage proof/);
  });
});
