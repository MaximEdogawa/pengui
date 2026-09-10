import { beforeAll, describe, expect, it } from "bun:test";
import type { ChiaOfferDriver } from "./driver";
import {
  aggregateSignatures,
  assembleSpendBundle,
  decodeOfferBundle,
  encodeOfferBundle,
  infinitySignature,
} from "./spendBundle";
import { OfferBuildError } from "./internal";
import { loadTestDriver } from "./__fixtures__/testDriver";
import {
  DEXIE_MAINNET_CAT_FOR_XCH_OFFER,
  DEXIE_MAINNET_XCH_FOR_CAT_OFFER,
  DEXIE_TESTNET_XCH_FOR_CAT_OFFER,
} from "./__fixtures__/offers";

const REAL_OFFERS = [
  ["mainnet XCH for CAT", DEXIE_MAINNET_XCH_FOR_CAT_OFFER],
  ["mainnet CAT for XCH", DEXIE_MAINNET_CAT_FOR_XCH_OFFER],
  ["testnet11 XCH for CAT", DEXIE_TESTNET_XCH_FOR_CAT_OFFER],
] as const;

describe("spend bundle assembly", () => {
  let driver: ChiaOfferDriver;

  beforeAll(async () => {
    driver = await loadTestDriver();
  });

  it("rebuilds a bundle from coin spends and an aggregated signature", () => {
    const bundle = decodeOfferBundle(driver, DEXIE_MAINNET_XCH_FOR_CAT_OFFER);
    const assembled = assembleSpendBundle(bundle.coin_spends, bundle.aggregated_signature);

    expect(assembled.coin_spends).toEqual(bundle.coin_spends);
    expect(assembled.aggregated_signature).toBe(bundle.aggregated_signature);
  });

  it("rejects a signature that is not 96 bytes", () => {
    const bundle = decodeOfferBundle(driver, DEXIE_MAINNET_XCH_FOR_CAT_OFFER);
    expect(() => assembleSpendBundle(bundle.coin_spends, "00".repeat(48))).toThrow(OfferBuildError);
  });

  it("rejects an empty bundle", () => {
    expect(() => assembleSpendBundle([], infinitySignature(driver))).toThrow(OfferBuildError);
  });

  it("aggregates signatures, with infinity as the identity", () => {
    const bundle = decodeOfferBundle(driver, DEXIE_MAINNET_XCH_FOR_CAT_OFFER);
    const combined = aggregateSignatures(driver, [
      bundle.aggregated_signature,
      infinitySignature(driver),
    ]);
    expect(combined).toBe(bundle.aggregated_signature);
  });
});

describe("offer encoding", () => {
  let driver: ChiaOfferDriver;

  beforeAll(async () => {
    driver = await loadTestDriver();
  });

  it.each(REAL_OFFERS)("round trips a real %s offer without losing anything", (_name, offer) => {
    const bundle = decodeOfferBundle(driver, offer);
    expect(bundle.coin_spends.length).toBeGreaterThan(1);

    const reencoded = encodeOfferBundle(driver, bundle);
    expect(reencoded.startsWith("offer1")).toBe(true);

    // The compression dictionary version may differ from the wallet that produced the
    // original string, so the bytes are not necessarily identical — the decoded bundle is.
    expect(decodeOfferBundle(driver, reencoded)).toEqual(bundle);
    expect(encodeOfferBundle(driver, decodeOfferBundle(driver, reencoded))).toBe(reencoded);
  });

  it("rejects a string that is not an offer", () => {
    expect(() => decodeOfferBundle(driver, "not-an-offer")).toThrow(OfferBuildError);
    expect(() => decodeOfferBundle(driver, "offer1notvalidbech32")).toThrow(OfferBuildError);
  });
});
