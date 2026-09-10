import { beforeAll, describe, expect, it } from "bun:test";
import { createOffer } from "./createOffer";
import type { ChiaOfferDriver } from "./driver";
import { isPlaceholderSpend, parseOffer } from "./parseOffer";
import { buildTakeOfferSpends, takeOffer } from "./takeOffer";
import {
  createTestWallet,
  findUnsatisfiedAssertions,
  loadTestDriver,
  verifyAggregatedSignature,
  type TestWallet,
} from "./__fixtures__/testDriver";

const CAT_ID = "ccda69ff6c44d687994efdbee30689be51d2347f739287ab4bb7b52344f8bf1d";

describe("takeOffer", () => {
  let driver: ChiaOfferDriver;
  let maker: TestWallet;
  let taker: TestWallet;

  beforeAll(async () => {
    driver = await loadTestDriver();
    maker = createTestWallet(driver, 1);
    taker = createTestWallet(driver, 2);
  });

  async function xchForCatOffer(): Promise<string> {
    const { offer } = await createOffer(
      driver,
      {
        coins: [maker.xchCoin("10000000000000")],
        changePuzzleHash: maker.puzzleHash,
        offerAssets: [{ assetId: null, amount: "1000000000000" }],
        requestAssets: [{ assetId: CAT_ID, amount: "39979142" }],
      },
      maker.sign
    );
    return offer;
  }

  async function catForXchOffer(): Promise<string> {
    const { offer } = await createOffer(
      driver,
      {
        coins: [maker.catCoin(CAT_ID, "50000")],
        changePuzzleHash: maker.puzzleHash,
        offerAssets: [{ assetId: CAT_ID, amount: "12500" }],
        requestAssets: [{ assetId: null, amount: "5053125000000" }],
      },
      maker.sign
    );
    return offer;
  }

  it("pays the requested CAT and claims the offered XCH", async () => {
    const offer = await xchForCatOffer();
    const plan = buildTakeOfferSpends(driver, {
      offer,
      coins: [taker.catCoin(CAT_ID, "50000000")],
      changePuzzleHash: taker.puzzleHash,
    });

    expect(plan.partialSign).toBe(false);
    expect(plan.payments).toEqual([{ assetId: CAT_ID, amount: "39979142" }]);

    // The maker's settlement XCH coin, the taker's CAT coin, and the ephemeral CAT
    // settlement coin that emits the announcement the maker's offer asserts.
    expect(plan.coinSpends).toHaveLength(3);
  });

  it("pays the requested XCH and claims the offered CAT", async () => {
    const offer = await catForXchOffer();
    const plan = buildTakeOfferSpends(driver, {
      offer,
      coins: [taker.xchCoin("10000000000000")],
      changePuzzleHash: taker.puzzleHash,
    });

    expect(plan.payments).toEqual([{ assetId: null, amount: "5053125000000" }]);
    expect(plan.coinSpends.length).toBeGreaterThanOrEqual(3);
  });

  it("produces a bundle whose signature covers both sides of the trade", async () => {
    const offer = await xchForCatOffer();
    const signed: { partialSign: boolean }[] = [];

    const result = await takeOffer(
      driver,
      {
        offer,
        coins: [taker.catCoin(CAT_ID, "50000000")],
        changePuzzleHash: taker.puzzleHash,
      },
      (coinSpends, options) => {
        signed.push(options);
        return taker.sign(coinSpends, options);
      }
    );

    expect(signed).toEqual([{ partialSign: false }]);

    // The maker's requested-payment placeholders never reach the mempool.
    expect(result.spendBundle.coin_spends.some(isPlaceholderSpend)).toBe(false);
    expect(result.spendBundle.coin_spends).toHaveLength(
      parseOffer(driver, offer).cancellableCoinSpends.length + result.takerCoinSpends.length
    );

    expect(
      verifyAggregatedSignature(
        driver,
        result.spendBundle.coin_spends,
        result.spendBundle.aggregated_signature
      )
    ).toBe(true);
  });

  it("adds the fee on top of the requested amount when both are XCH", async () => {
    const offer = await catForXchOffer();
    const withoutFee = buildTakeOfferSpends(driver, {
      offer,
      coins: [taker.xchCoin("5053125000000", 31)],
      changePuzzleHash: taker.puzzleHash,
    });
    expect(withoutFee.coinSpends.length).toBeGreaterThan(0);

    expect(() =>
      buildTakeOfferSpends(driver, {
        offer,
        coins: [taker.xchCoin("5053125000000", 31)],
        changePuzzleHash: taker.puzzleHash,
        fee: "1000",
      })
    ).toThrow(/Not enough XCH/);
  });

  it("refuses to take an offer it cannot pay for", async () => {
    const offer = await xchForCatOffer();
    expect(() =>
      buildTakeOfferSpends(driver, {
        offer,
        coins: [taker.catCoin(CAT_ID, "10")],
        changePuzzleHash: taker.puzzleHash,
      })
    ).toThrow(/Not enough CAT/);
  });

  it("rejects an offer string that is not an offer", () => {
    expect(() =>
      buildTakeOfferSpends(driver, {
        offer: "not-an-offer",
        coins: [taker.xchCoin("1000")],
        changePuzzleHash: taker.puzzleHash,
      })
    ).toThrow(/offer1/);
  });
});

describe("offer settlement", () => {
  let driver: ChiaOfferDriver;
  let maker: TestWallet;
  let taker: TestWallet;

  beforeAll(async () => {
    driver = await loadTestDriver();
    maker = createTestWallet(driver, 3);
    taker = createTestWallet(driver, 4);
  });

  it("satisfies every announcement the maker's offer asserts", async () => {
    const { offer } = await createOffer(
      driver,
      {
        coins: [maker.xchCoin("10000000000000")],
        changePuzzleHash: maker.puzzleHash,
        offerAssets: [{ assetId: null, amount: "1000000000000" }],
        requestAssets: [{ assetId: CAT_ID, amount: "39979142" }],
      },
      maker.sign
    );

    const { spendBundle } = await takeOffer(
      driver,
      {
        offer,
        coins: [taker.catCoin(CAT_ID, "50000000")],
        changePuzzleHash: taker.puzzleHash,
      },
      taker.sign
    );

    expect(findUnsatisfiedAssertions(driver, spendBundle.coin_spends)).toEqual([]);
  });

  it("satisfies every announcement when the maker offers a CAT for XCH", async () => {
    const { offer } = await createOffer(
      driver,
      {
        coins: [maker.catCoin(CAT_ID, "50000")],
        changePuzzleHash: maker.puzzleHash,
        offerAssets: [{ assetId: CAT_ID, amount: "12500" }],
        requestAssets: [{ assetId: null, amount: "5053125000000" }],
      },
      maker.sign
    );

    const { spendBundle } = await takeOffer(
      driver,
      {
        offer,
        coins: [taker.xchCoin("10000000000000")],
        changePuzzleHash: taker.puzzleHash,
      },
      taker.sign
    );

    expect(findUnsatisfiedAssertions(driver, spendBundle.coin_spends)).toEqual([]);
    expect(
      verifyAggregatedSignature(driver, spendBundle.coin_spends, spendBundle.aggregated_signature)
    ).toBe(true);
  });

  it("leaves the maker's assertion unsatisfied when the offer is submitted alone", async () => {
    const { spendBundle } = await createOffer(
      driver,
      {
        coins: [maker.xchCoin("10000000000000", 41)],
        changePuzzleHash: maker.puzzleHash,
        offerAssets: [{ assetId: null, amount: "1000000000000" }],
        requestAssets: [{ assetId: CAT_ID, amount: "39979142" }],
      },
      maker.sign
    );

    const unsatisfied = findUnsatisfiedAssertions(driver, spendBundle.coin_spends);
    expect(unsatisfied).toHaveLength(1);
    expect(unsatisfied[0].kind).toBe("puzzle-announcement");
  });
});
