import { beforeAll, describe, expect, it } from "bun:test";
import { assembleCreateOfferResult, buildCreateOfferSpends, createOffer } from "./createOffer";
import type { ChiaOfferDriver } from "./driver";
import { OfferBuildError, settlementPuzzleHashFor } from "./internal";
import { parseOffer } from "./parseOffer";
import {
  createTestWallet,
  loadTestDriver,
  verifyAggregatedSignature,
  type TestWallet,
} from "./__fixtures__/testDriver";

const CAT_ID = "ccda69ff6c44d687994efdbee30689be51d2347f739287ab4bb7b52344f8bf1d";

describe("buildCreateOfferSpends", () => {
  let driver: ChiaOfferDriver;
  let maker: TestWallet;

  beforeAll(async () => {
    driver = await loadTestDriver();
    maker = createTestWallet(driver, 1);
  });

  it("sends the offered XCH to the settlement puzzle and the rest back as change", () => {
    const plan = buildCreateOfferSpends(driver, {
      coins: [maker.xchCoin("10000000000000")],
      changePuzzleHash: maker.puzzleHash,
      offerAssets: [{ assetId: null, amount: "1000000000000" }],
      requestAssets: [{ assetId: CAT_ID, amount: "39979142" }],
    });

    expect(plan.partialSign).toBe(true);
    expect(plan.coinSpends).toHaveLength(1);
    expect(plan.requestedPaymentSpends).toHaveLength(1);
    expect(plan.cancellableCoinIds).toHaveLength(1);

    const placeholder = plan.requestedPaymentSpends[0];
    expect(placeholder.coin.parent_coin_info).toBe("0".repeat(64));
    expect(placeholder.coin.amount).toBe("0");
    expect(placeholder.coin.puzzle_hash).toBe(settlementPuzzleHashFor(driver, CAT_ID));
  });

  it("spends every coin it selects and reports them as cancellable", () => {
    const coins = [
      maker.xchCoin("400000000000", 11),
      maker.xchCoin("400000000000", 12),
      maker.xchCoin("400000000000", 13),
    ];
    const plan = buildCreateOfferSpends(driver, {
      coins,
      changePuzzleHash: maker.puzzleHash,
      offerAssets: [{ assetId: null, amount: "1000000000000" }],
      requestAssets: [{ assetId: CAT_ID, amount: "1" }],
    });

    expect(plan.coinSpends.length).toBeGreaterThan(1);
    expect(plan.cancellableCoinIds).toHaveLength(plan.coinSpends.length);
    expect(new Set(plan.coinSpends.map((spend) => spend.coin.parent_coin_info)).size).toBe(
      plan.coinSpends.length
    );
  });

  it("offers CATs, wrapping the settlement puzzle in the CAT layer", async () => {
    const plan = buildCreateOfferSpends(driver, {
      coins: [maker.catCoin(CAT_ID, "50000")],
      changePuzzleHash: maker.puzzleHash,
      offerAssets: [{ assetId: CAT_ID, amount: "12500" }],
      requestAssets: [{ assetId: null, amount: "5053125000000" }],
    });

    const result = assembleCreateOfferResult(driver, plan, await maker.sign(plan.coinSpends, plan));
    const parsed = parseOffer(driver, result.offer);

    expect(parsed.offeredCoins).toEqual([
      {
        assetId: CAT_ID,
        settlementPuzzleHash: settlementPuzzleHashFor(driver, CAT_ID),
        coin: expect.objectContaining({ amount: "12500" }),
      },
    ]);
    expect(parsed.requestedPayments[0].assetId).toBeNull();
    expect(parsed.requestedPayments[0].totalAmount).toBe("5053125000000");
  });

  it("reserves the fee on top of the offered XCH", () => {
    const plan = buildCreateOfferSpends(driver, {
      coins: [maker.xchCoin("1000")],
      changePuzzleHash: maker.puzzleHash,
      offerAssets: [{ assetId: null, amount: "900" }],
      requestAssets: [{ assetId: CAT_ID, amount: "1" }],
      fee: "100",
    });

    // 900 offered + 100 fee consumes the whole coin, so there is no change output.
    expect(plan.coinSpends).toHaveLength(1);
    expect(() =>
      buildCreateOfferSpends(driver, {
        coins: [maker.xchCoin("1000")],
        changePuzzleHash: maker.puzzleHash,
        offerAssets: [{ assetId: null, amount: "1000" }],
        requestAssets: [{ assetId: CAT_ID, amount: "1" }],
        fee: "100",
      })
    ).toThrow(/Not enough XCH/);
  });

  it("rejects offers that cannot be settled", () => {
    const base = {
      coins: [maker.xchCoin("1000")],
      changePuzzleHash: maker.puzzleHash,
    };

    expect(() =>
      buildCreateOfferSpends(driver, { ...base, offerAssets: [], requestAssets: [{ amount: "1" }] })
    ).toThrow(/at least one asset/);
    expect(() =>
      buildCreateOfferSpends(driver, {
        ...base,
        offerAssets: [{ assetId: null, amount: "1" }],
        requestAssets: [],
      })
    ).toThrow(/at least one asset/);
    expect(() =>
      buildCreateOfferSpends(driver, {
        ...base,
        offerAssets: [{ assetId: null, amount: "1" }],
        requestAssets: [{ assetId: null, amount: "2" }],
      })
    ).toThrow(/both sides/);
    expect(() =>
      buildCreateOfferSpends(driver, {
        ...base,
        offerAssets: [{ assetId: null, amount: "0" }],
        requestAssets: [{ assetId: CAT_ID, amount: "1" }],
      })
    ).toThrow(OfferBuildError);
  });
});

describe("createOffer", () => {
  let driver: ChiaOfferDriver;
  let maker: TestWallet;

  beforeAll(async () => {
    driver = await loadTestDriver();
    maker = createTestWallet(driver, 1);
  });

  it("produces a signed, verifiable offer that parses back to the same trade", async () => {
    const signed: { partialSign: boolean }[] = [];
    const result = await createOffer(
      driver,
      {
        coins: [maker.xchCoin("10000000000000")],
        changePuzzleHash: maker.puzzleHash,
        offerAssets: [{ assetId: null, amount: "1000000000000" }],
        requestAssets: [{ assetId: CAT_ID, amount: "39979142" }],
      },
      (coinSpends, options) => {
        signed.push(options);
        return maker.sign(coinSpends, options);
      }
    );

    expect(signed).toEqual([{ partialSign: true }]);
    expect(result.offer.startsWith("offer1")).toBe(true);

    // The wallet only signs the real spends; the placeholders are appended afterwards.
    expect(result.spendBundle.coin_spends).toHaveLength(2);
    expect(
      verifyAggregatedSignature(
        driver,
        result.spendBundle.coin_spends,
        result.spendBundle.aggregated_signature
      )
    ).toBe(true);

    const parsed = parseOffer(driver, result.offer);
    expect(parsed.offeredCoins[0].coin.amount).toBe("1000000000000");
    expect(parsed.requestedPayments[0].totalAmount).toBe("39979142");
    expect(parsed.cancellableCoinSpends).toHaveLength(1);
    expect(parsed.hasUnsupportedAssets).toBe(false);
  });

  it("notarises the requested payments against exactly the coins it spends", async () => {
    const result = await createOffer(
      driver,
      {
        coins: [maker.xchCoin("2000", 21), maker.xchCoin("2000", 22)],
        changePuzzleHash: maker.puzzleHash,
        offerAssets: [{ assetId: null, amount: "3000" }],
        requestAssets: [{ assetId: CAT_ID, amount: "7" }],
      },
      maker.sign
    );

    const parsed = parseOffer(driver, result.offer);
    const nonce = parsed.requestedPayments[0].notarizedPayments[0].nonce;
    const { notarizedPaymentNonce } = await import("./internal");

    expect(nonce).toBe(notarizedPaymentNonce(driver, result.cancellableCoinIds));
    expect(result.cancellableCoinIds).toHaveLength(2);
  });
});
