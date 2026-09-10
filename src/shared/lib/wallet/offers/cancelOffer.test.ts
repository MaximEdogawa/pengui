import { beforeAll, describe, expect, it } from "bun:test";
import { assembleCancelOfferResult, buildCancelOfferSpends, cancelOffer } from "./cancelOffer";
import { createOffer } from "./createOffer";
import type { ChiaOfferDriver } from "./driver";
import { OfferBuildError } from "./internal";
import { parseOffer } from "./parseOffer";
import {
  createTestWallet,
  findUnsatisfiedAssertions,
  loadTestDriver,
  verifyAggregatedSignature,
  type TestWallet,
} from "./__fixtures__/testDriver";

const CAT_ID = "ccda69ff6c44d687994efdbee30689be51d2347f739287ab4bb7b52344f8bf1d";

describe("buildCancelOfferSpends", () => {
  let driver: ChiaOfferDriver;
  let maker: TestWallet;

  beforeAll(async () => {
    driver = await loadTestDriver();
    maker = createTestWallet(driver, 5);
  });

  it("spends the offer's coins back to the wallet", async () => {
    const offerCoin = maker.xchCoin("10000000000000");
    const { offer, cancellableCoinIds } = await createOffer(
      driver,
      {
        coins: [offerCoin],
        changePuzzleHash: maker.puzzleHash,
        offerAssets: [{ assetId: null, amount: "1000000000000" }],
        requestAssets: [{ assetId: CAT_ID, amount: "39979142" }],
      },
      maker.sign
    );

    // The coins to cancel are exactly the ones the offer consumes.
    const parsed = parseOffer(driver, offer);
    expect(parsed.cancellableCoinSpends).toHaveLength(1);
    expect(parsed.cancellableCoinSpends[0].coin.puzzle_hash).toBe(maker.puzzleHash);

    const plan = buildCancelOfferSpends(driver, {
      coins: [offerCoin],
      changePuzzleHash: maker.puzzleHash,
    });

    expect(plan.partialSign).toBe(false);
    expect(plan.spentCoinIds).toEqual(cancellableCoinIds);
    expect(plan.coinSpends).toHaveLength(1);
    // The cancel spend consumes the same coin the offer does, which is what invalidates it.
    expect(plan.coinSpends[0].coin).toEqual(parsed.cancellableCoinSpends[0].coin);
    // ...but with a different solution, so it is a competing spend, not the offer's.
    expect(plan.coinSpends[0].solution).not.toBe(parsed.cancellableCoinSpends[0].solution);
  });

  it("cancels a CAT offer, keeping the CAT lineage intact", () => {
    const catCoin = maker.catCoin(CAT_ID, "50000");
    const plan = buildCancelOfferSpends(driver, {
      coins: [catCoin],
      changePuzzleHash: maker.puzzleHash,
    });

    expect(plan.coinSpends).toHaveLength(1);
    expect(plan.coinSpends[0].coin.puzzle_hash).toBe(catCoin.coin.puzzle_hash);
    expect(findUnsatisfiedAssertions(driver, plan.coinSpends)).toEqual([]);
  });

  it("spends coins the wallet has reserved for the live offer", () => {
    const reserved = { ...maker.xchCoin("1000"), locked: true };
    const plan = buildCancelOfferSpends(driver, {
      coins: [reserved],
      changePuzzleHash: maker.puzzleHash,
    });

    expect(plan.spentCoinIds).toEqual([reserved.coinName!]);
  });

  it("pays a fee from a separate XCH coin when cancelling a CAT offer", () => {
    const plan = buildCancelOfferSpends(driver, {
      coins: [maker.catCoin(CAT_ID, "50000")],
      changePuzzleHash: maker.puzzleHash,
      fee: "1000",
      feeCoins: [maker.xchCoin("100000", 51)],
    });

    expect(plan.coinSpends).toHaveLength(2);
    expect(plan.spentCoinIds).toHaveLength(2);
  });

  it("refuses to cancel without any coins", () => {
    expect(() =>
      buildCancelOfferSpends(driver, { coins: [], changePuzzleHash: maker.puzzleHash })
    ).toThrow(OfferBuildError);
  });

  it("refuses a fee it cannot cover", () => {
    expect(() =>
      buildCancelOfferSpends(driver, {
        coins: [maker.catCoin(CAT_ID, "50000")],
        changePuzzleHash: maker.puzzleHash,
        fee: "1000",
      })
    ).toThrow(/Not enough XCH/);
  });
});

describe("cancelOffer", () => {
  let driver: ChiaOfferDriver;
  let maker: TestWallet;

  beforeAll(async () => {
    driver = await loadTestDriver();
    maker = createTestWallet(driver, 5);
  });

  it("produces a signed, verifiable cancel transaction", async () => {
    const signed: { partialSign: boolean }[] = [];
    const result = await cancelOffer(
      driver,
      {
        coins: [maker.xchCoin("10000000000000")],
        changePuzzleHash: maker.puzzleHash,
        fee: "1000",
      },
      (coinSpends, options) => {
        signed.push(options);
        return maker.sign(coinSpends, options);
      }
    );

    expect(signed).toEqual([{ partialSign: false }]);
    expect(
      verifyAggregatedSignature(
        driver,
        result.spendBundle.coin_spends,
        result.spendBundle.aggregated_signature
      )
    ).toBe(true);
    expect(findUnsatisfiedAssertions(driver, result.spendBundle.coin_spends)).toEqual([]);
  });

  it("assembles the bundle from a plan and a signature", async () => {
    const plan = buildCancelOfferSpends(driver, {
      coins: [maker.xchCoin("5000")],
      changePuzzleHash: maker.puzzleHash,
    });
    const signature = await maker.sign(plan.coinSpends, plan);
    const result = assembleCancelOfferResult(plan, signature);

    expect(result.spendBundle.coin_spends).toEqual(plan.coinSpends);
    expect(result.spendBundle.aggregated_signature).toBe(signature);
  });
});
