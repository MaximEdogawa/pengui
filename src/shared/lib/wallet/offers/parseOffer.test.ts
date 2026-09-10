import { beforeAll, describe, expect, it } from "bun:test";
import type { ChiaOfferDriver } from "./driver";
import { isPlaceholderSpend, parseOffer } from "./parseOffer";
import { settlementPuzzleHashFor } from "./internal";
import { loadTestDriver } from "./__fixtures__/testDriver";
import {
  DEXIE_MAINNET_CAT_FOR_XCH_OFFER,
  DEXIE_MAINNET_CAT_FOR_XCH_TRADE,
  DEXIE_MAINNET_XCH_FOR_CAT_OFFER,
  DEXIE_MAINNET_XCH_FOR_CAT_TRADE,
  DEXIE_TESTNET_XCH_FOR_CAT_OFFER,
} from "./__fixtures__/offers";

describe("parseOffer", () => {
  let driver: ChiaOfferDriver;

  beforeAll(async () => {
    driver = await loadTestDriver();
  });

  it("reads a real mainnet XCH-for-CAT offer the way Dexie describes it", () => {
    const parsed = parseOffer(driver, DEXIE_MAINNET_XCH_FOR_CAT_OFFER);

    expect(parsed.hasUnsupportedAssets).toBe(false);

    const offeredXch = parsed.offeredCoins.filter((coin) => coin.assetId === null);
    expect(offeredXch.length).toBeGreaterThan(0);
    const offeredTotal = offeredXch.reduce(
      (sum, coin) => sum + BigInt(coin.coin.amount),
      BigInt(0)
    );
    expect(offeredTotal.toString()).toBe(DEXIE_MAINNET_XCH_FOR_CAT_TRADE.offeredMojos);

    expect(parsed.requestedPayments).toHaveLength(1);
    const [requested] = parsed.requestedPayments;
    expect(requested.assetId).toBe(DEXIE_MAINNET_XCH_FOR_CAT_TRADE.requestedAssetId);
    expect(requested.totalAmount).toBe(DEXIE_MAINNET_XCH_FOR_CAT_TRADE.requestedUnits);
    expect(requested.settlementPuzzleHash).toBe(
      settlementPuzzleHashFor(driver, DEXIE_MAINNET_XCH_FOR_CAT_TRADE.requestedAssetId)
    );
  });

  it("reads a real mainnet CAT-for-XCH offer, including the CAT lineage", () => {
    const parsed = parseOffer(driver, DEXIE_MAINNET_CAT_FOR_XCH_OFFER);

    const offeredCat = parsed.offeredCoins.filter(
      (coin) => coin.assetId === DEXIE_MAINNET_CAT_FOR_XCH_TRADE.offeredAssetId
    );
    const offeredTotal = offeredCat.reduce(
      (sum, coin) => sum + BigInt(coin.coin.amount),
      BigInt(0)
    );
    expect(offeredTotal.toString()).toBe(DEXIE_MAINNET_CAT_FOR_XCH_TRADE.offeredUnits);
    expect(offeredCat[0].settlementPuzzleHash).toBe(
      settlementPuzzleHashFor(driver, DEXIE_MAINNET_CAT_FOR_XCH_TRADE.offeredAssetId)
    );

    expect(parsed.requestedPayments).toHaveLength(1);
    expect(parsed.requestedPayments[0].assetId).toBeNull();
    expect(parsed.requestedPayments[0].totalAmount).toBe(
      DEXIE_MAINNET_CAT_FOR_XCH_TRADE.requestedMojos
    );
  });

  it("notarises the requested payments against the coins the offer spends", () => {
    const parsed = parseOffer(driver, DEXIE_TESTNET_XCH_FOR_CAT_OFFER);
    const nonces = new Set(
      parsed.requestedPayments.flatMap((requested) =>
        requested.notarizedPayments.map((payment) => payment.nonce)
      )
    );

    expect(nonces.size).toBe(1);
    expect([...nonces][0]).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hints the receiving puzzle hash on requested payments so the coin is discoverable", () => {
    const parsed = parseOffer(driver, DEXIE_TESTNET_XCH_FOR_CAT_OFFER);
    const [payment] = parsed.requestedPayments[0].notarizedPayments[0].payments;

    expect(payment.amount).toBe("1000");
    expect(payment.memos).toBeDefined();
    expect(payment.memos).toContain(payment.puzzleHash);
  });

  it("lists the maker's own inputs as the coins that cancel the offer", () => {
    const parsed = parseOffer(driver, DEXIE_TESTNET_XCH_FOR_CAT_OFFER);

    // Two XCH inputs in this offer, neither created inside the bundle.
    expect(parsed.cancellableCoinSpends).toHaveLength(2);
    for (const coinSpend of parsed.cancellableCoinSpends) {
      expect(isPlaceholderSpend(coinSpend)).toBe(false);
    }
    expect(parsed.cancellableCoinSpends.map((spend) => spend.coin.puzzle_hash)).toEqual([
      "50fee558db79c4bc16df0ad67598283e86bcd2a9fd1d4c8ecfc89829189be6d9",
      "50fee558db79c4bc16df0ad67598283e86bcd2a9fd1d4c8ecfc89829189be6d9",
    ]);
  });

  it("identifies placeholder spends by their all-zero parent coin id", () => {
    const parsed = parseOffer(driver, DEXIE_MAINNET_XCH_FOR_CAT_OFFER);
    const placeholders = parsed.coinSpends.filter(isPlaceholderSpend);

    expect(placeholders).toHaveLength(parsed.requestedPayments.length);
    for (const placeholder of placeholders) {
      expect(placeholder.coin.amount).toBe("0");
    }
  });
});
