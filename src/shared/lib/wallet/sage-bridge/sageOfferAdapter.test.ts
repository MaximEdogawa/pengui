import { beforeAll, describe, expect, it } from "bun:test";
import type { SageClient } from "sage-app-sdk";
import { sageCancelOffer, sageCreateOffer, sageTakeOffer } from "./sageOfferAdapter";
import {
  createOffer as buildRealOffer,
  hexToBytes,
  parseOffer,
  type AssetCoinInput,
  type ChiaOfferDriver,
} from "@/shared/lib/wallet/offers";
import {
  createTestWallet,
  findUnsatisfiedAssertions,
  loadTestDriver,
  verifyAggregatedSignature,
  type TestWallet,
} from "@/shared/lib/wallet/offers/__fixtures__/testDriver";

const CAT_ID = "ccda69ff6c44d687994efdbee30689be51d2347f739287ab4bb7b52344f8bf1d";

/**
 * A minimal fake `SageClient` covering only `wallet.*` — everything
 * `sageOfferAdapter.ts` actually calls. `app` / `environment` are not needed
 * here (see `SageBridgeProvider.test.ts` for the full adapter lifecycle).
 */
function fakeWalletClient(
  driver: ChiaOfferDriver,
  wallet: TestWallet,
  coinsByAssetId: ReadonlyMap<string | null, AssetCoinInput[]>
) {
  const sentBundles: Array<{ coin_spends: unknown[]; aggregated_signature: string }> = [];
  const receiveAddress = new driver.Address(hexToBytes(wallet.puzzleHash), "txch").encode();

  const client = {
    wallet: {
      getAssetCoins: async ({ assetId }: { assetId?: string | null }) =>
        coinsByAssetId.get(assetId ?? null) ?? [],
      getSyncStatus: async () => ({
        selectable_balance: "0",
        unit: { ticker: "TXCH", precision: 12 },
        synced_coins: 1,
        total_coins: 1,
        receive_address: receiveAddress,
        burn_address: "txch1burn",
        unhardened_derivation_index: 0,
        hardened_derivation_index: 0,
        checked_files: 0,
        total_files: 0,
        database_size: 0,
      }),
      signCoinSpends: async ({
        coinSpends,
        partialSign,
      }: {
        coinSpends: Parameters<TestWallet["sign"]>[0];
        partialSign?: boolean | null;
      }) => wallet.sign(coinSpends, { partialSign: partialSign ?? false }),
      sendTransaction: async ({
        spendBundle,
      }: {
        spendBundle: { coin_spends: unknown[]; aggregated_signature: string };
      }) => {
        sentBundles.push(spendBundle);
        return { status: 1, error: null };
      },
    },
  } as unknown as SageClient;

  return { client, sentBundles, receiveAddress };
}

describe("sageOfferAdapter", () => {
  let driver: ChiaOfferDriver;
  let maker: TestWallet;
  let taker: TestWallet;

  beforeAll(async () => {
    driver = await loadTestDriver();
    maker = createTestWallet(driver, 21);
    taker = createTestWallet(driver, 22);
  });

  describe("sageCreateOffer", () => {
    it("builds, signs and returns an offer for XCH -> CAT", async () => {
      const coin = maker.xchCoin("10000000000000");
      const { client, sentBundles } = fakeWalletClient(
        driver,
        maker,
        new Map([[null, [coin]]])
      );

      const result = await sageCreateOffer(driver, client, {
        walletId: 1,
        offerAssets: [{ assetId: "", amount: 1_000_000_000_000 }],
        requestAssets: [{ assetId: CAT_ID, amount: 39_979_142 }],
      });

      expect(result.offer).toStartWith("offer1");
      expect(result.id).toBe(result.tradeId);
      expect(result.id.length).toBeGreaterThan(0);
      expect(sentBundles).toHaveLength(0); // the maker signs, but never broadcasts

      const parsed = parseOffer(driver, result.offer);
      expect(parsed.offeredCoins[0]?.assetId).toBeNull();
      expect(parsed.requestedPayments[0]?.assetId).toBe(CAT_ID);
      expect(parsed.requestedPayments[0]?.totalAmount).toBe("39979142");
    });

    it("gathers CAT coins too when the offer includes a CAT", async () => {
      const catCoin = maker.catCoin(CAT_ID, "50000");
      const { client } = fakeWalletClient(
        driver,
        maker,
        new Map([
          [null, []],
          [CAT_ID, [catCoin]],
        ])
      );

      const result = await sageCreateOffer(driver, client, {
        walletId: 1,
        offerAssets: [{ assetId: CAT_ID, amount: 12_500 }],
        requestAssets: [{ assetId: "", amount: 5_053_125_000_000 }],
      });

      const parsed = parseOffer(driver, result.offer);
      expect(parsed.offeredCoins[0]?.assetId).toBe(CAT_ID);
    });
  });

  describe("sageTakeOffer", () => {
    it("takes a maker offer end to end: real signatures, no unsatisfied assertions", async () => {
      const makerOffer = await buildRealOffer(
        driver,
        {
          coins: [maker.xchCoin("10000000000000", 31)],
          changePuzzleHash: maker.puzzleHash,
          offerAssets: [{ assetId: null, amount: "1000000000000" }],
          requestAssets: [{ assetId: CAT_ID, amount: "39979142" }],
        },
        maker.sign
      );

      const takerCatCoin = taker.catCoin(CAT_ID, "50000000", 32);
      const { client, sentBundles } = fakeWalletClient(
        driver,
        taker,
        new Map([
          [null, []],
          [CAT_ID, [takerCatCoin]],
        ])
      );

      const result = await sageTakeOffer(driver, client, { offer: makerOffer.offer });

      expect(result.success).toBe(true);
      expect(sentBundles).toHaveLength(1);

      const bundle = sentBundles[0] as unknown as {
        coin_spends: Parameters<typeof verifyAggregatedSignature>[1];
        aggregated_signature: string;
      };
      expect(
        verifyAggregatedSignature(driver, bundle.coin_spends, bundle.aggregated_signature)
      ).toBe(true);
      expect(findUnsatisfiedAssertions(driver, bundle.coin_spends)).toEqual([]);
    });

    it("refuses an offer with unsupported assets before touching the bridge", async () => {
      const { client } = fakeWalletClient(driver, taker, new Map());
      // Not a real NFT/DID offer -- just an undecodable string, which is enough to
      // prove the adapter surfaces a build error rather than an opaque bridge failure.
      await expect(sageTakeOffer(driver, client, { offer: "offer1notarealoffer" })).rejects.toThrow();
    });
  });

  describe("sageCancelOffer", () => {
    it("spends the offer's coin back to the wallet when it is still held", async () => {
      const coin = maker.xchCoin("10000000000000", 41);
      const makerOffer = await buildRealOffer(
        driver,
        {
          coins: [coin],
          changePuzzleHash: maker.puzzleHash,
          offerAssets: [{ assetId: null, amount: "1000000000000" }],
          requestAssets: [{ assetId: CAT_ID, amount: "1" }],
        },
        maker.sign
      );

      // Sage still reports the coin as spendable (locked, since it backs a live offer).
      const { client, sentBundles } = fakeWalletClient(
        driver,
        maker,
        new Map([[null, [{ ...coin, locked: true }]]])
      );

      const result = await sageCancelOffer(driver, client, {
        id: "whatever-the-local-trade-id-was",
        offerString: makerOffer.offer,
      });

      expect(result.success).toBe(true);
      expect(sentBundles).toHaveLength(1);
      const bundle = sentBundles[0] as unknown as {
        coin_spends: Parameters<typeof verifyAggregatedSignature>[1];
        aggregated_signature: string;
      };
      expect(
        verifyAggregatedSignature(driver, bundle.coin_spends, bundle.aggregated_signature)
      ).toBe(true);
    });

    it("rejects when no offerString is provided", async () => {
      const { client } = fakeWalletClient(driver, maker, new Map());
      await expect(sageCancelOffer(driver, client, { id: "abc" })).rejects.toThrow(/offerString/);
    });

    it("rejects when the offer's coin is no longer held", async () => {
      const coin = maker.xchCoin("10000000000000", 51);
      const makerOffer = await buildRealOffer(
        driver,
        {
          coins: [coin],
          changePuzzleHash: maker.puzzleHash,
          offerAssets: [{ assetId: null, amount: "1000000000000" }],
          requestAssets: [{ assetId: CAT_ID, amount: "1" }],
        },
        maker.sign
      );

      // Sage no longer reports the offer's coin (already spent/taken).
      const { client } = fakeWalletClient(driver, maker, new Map([[null, []]]));

      await expect(
        sageCancelOffer(driver, client, { id: "abc", offerString: makerOffer.offer })
      ).rejects.toThrow(/anymore/);
    });
  });
});
