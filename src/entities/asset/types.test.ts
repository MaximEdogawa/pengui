import { describe, it, expect } from "bun:test";
import {
  toWalletAsset,
  fromWalletAsset,
  tickerToAsset,
  assetToBaseAsset,
  toWalletAssets,
  fromWalletAssets,
  type BaseAsset,
  type WalletAsset,
  type Ticker,
  type Asset,
} from "./types";
import { MOJOS_PER_XCH } from "@/shared/lib/formatting/chia-units";

// Helper converter stubs
const convertToSmallestUnit = (amount: number, type: string): number => {
  if (type === "xch") return Math.round(amount * MOJOS_PER_XCH);
  if (type === "cat") return Math.round(amount * 1000);
  return Math.floor(amount);
};
const convertFromSmallestUnit = (amount: number, type: string): number => {
  if (type === "xch") return amount / MOJOS_PER_XCH;
  if (type === "cat") return amount / 1000;
  return amount;
};

const xchAsset: BaseAsset = { assetId: "xch-id", amount: 1, type: "xch" };
const catAsset: BaseAsset = {
  assetId: "cat-asset-id-abc123",
  amount: 5,
  type: "cat",
  symbol: "SBX",
  name: "Spacebucks",
};

describe("toWalletAsset", () => {
  it("should convert XCH to wallet asset with empty assetId", () => {
    const result = toWalletAsset(xchAsset, convertToSmallestUnit);
    expect(result.assetId).toBe("");
    expect(result.amount).toBe(MOJOS_PER_XCH);
  });

  it("should convert CAT to wallet asset preserving assetId", () => {
    const result = toWalletAsset(catAsset, convertToSmallestUnit);
    expect(result.assetId).toBe("cat-asset-id-abc123");
    expect(result.amount).toBe(5000);
  });

  it("should call convertToSmallestUnit with the correct type", () => {
    const calls: { amount: number; type: string }[] = [];
    const spy = (amount: number, type: string) => {
      calls.push({ amount, type });
      return convertToSmallestUnit(amount, type);
    };
    toWalletAsset(xchAsset, spy as typeof convertToSmallestUnit);
    expect(calls[0]).toEqual({ amount: 1, type: "xch" });
  });
});

describe("fromWalletAsset", () => {
  it("should convert empty assetId wallet asset to XCH BaseAsset", () => {
    const walletAsset: WalletAsset = { assetId: "", amount: MOJOS_PER_XCH };
    const result = fromWalletAsset(walletAsset, convertFromSmallestUnit);
    expect(result.type).toBe("xch");
    expect(result.amount).toBe(1);
    expect(result.assetId).toBe("");
  });

  it("should convert non-empty assetId wallet asset to CAT BaseAsset", () => {
    const walletAsset: WalletAsset = { assetId: "cat-asset-id-abc123", amount: 5000 };
    const result = fromWalletAsset(walletAsset, convertFromSmallestUnit, "cat");
    expect(result.type).toBe("cat");
    expect(result.amount).toBe(5);
    expect(result.assetId).toBe("cat-asset-id-abc123");
  });

  it("should default to 'cat' type when assetType is not provided", () => {
    const walletAsset: WalletAsset = { assetId: "some-id", amount: 1000 };
    const result = fromWalletAsset(walletAsset, convertFromSmallestUnit);
    expect(result.type).toBe("cat");
  });
});

describe("tickerToAsset", () => {
  const ticker: Ticker = {
    tickerId: "SBX_XCH",
    baseCurrency: "spacebucks-asset-id",
    targetCurrency: "xch",
    baseCode: "SBX",
    targetCode: "XCH",
    baseName: "Spacebucks",
    targetName: "Chia",
    lastPrice: 0.001,
    currentAvgPrice: 0.001,
    baseVolume: 100000,
    targetVolume: 100,
    poolId: "pool-123",
    bid: 0.0009,
    ask: 0.0011,
    high: 0.002,
    low: 0.0008,
  };

  it("should convert ticker to asset with correct fields", () => {
    const result = tickerToAsset(ticker);
    expect(result.assetId).toBe("spacebucks-asset-id");
    expect(result.ticker).toBe("SBX");
    expect(result.name).toBe("Spacebucks");
    expect(result.symbol).toBe("SBX");
    expect(result.type).toBe("cat");
  });

  it("should always set type to 'cat'", () => {
    const result = tickerToAsset(ticker);
    expect(result.type).toBe("cat");
  });
});

describe("assetToBaseAsset", () => {
  const asset: Asset = {
    assetId: "spacebucks-asset-id",
    ticker: "SBX",
    name: "Spacebucks",
    symbol: "SBX",
    type: "cat",
  };

  it("should convert asset to BaseAsset with default amount 0", () => {
    const result = assetToBaseAsset(asset);
    expect(result.assetId).toBe("spacebucks-asset-id");
    expect(result.amount).toBe(0);
    expect(result.type).toBe("cat");
    expect(result.symbol).toBe("SBX");
    expect(result.name).toBe("Spacebucks");
  });

  it("should use provided amount", () => {
    const result = assetToBaseAsset(asset, 42);
    expect(result.amount).toBe(42);
  });
});

describe("toWalletAssets", () => {
  it("should convert array of BaseAssets to WalletAssets", () => {
    const assets: BaseAsset[] = [xchAsset, catAsset];
    const results = toWalletAssets(assets, convertToSmallestUnit);
    expect(results).toHaveLength(2);
    expect(results[0].assetId).toBe("");
    expect(results[1].assetId).toBe("cat-asset-id-abc123");
  });

  it("should return empty array for empty input", () => {
    const results = toWalletAssets([], convertToSmallestUnit);
    expect(results).toHaveLength(0);
  });
});

describe("fromWalletAssets", () => {
  it("should convert array of WalletAssets to BaseAssets", () => {
    const walletAssets: WalletAsset[] = [
      { assetId: "", amount: MOJOS_PER_XCH },
      { assetId: "cat-asset-id-abc123", amount: 5000 },
    ];
    const results = fromWalletAssets(walletAssets, convertFromSmallestUnit);
    expect(results).toHaveLength(2);
    expect(results[0].type).toBe("xch");
    expect(results[1].type).toBe("cat");
  });

  it("should return empty array for empty input", () => {
    const results = fromWalletAssets([], convertFromSmallestUnit);
    expect(results).toHaveLength(0);
  });
});
