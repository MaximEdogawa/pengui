import { describe, it, expect } from "bun:test";
import type {
  EnvironmentGetNetworkResult,
  EnvironmentThemeView,
  GetTransactionsResponse,
  WalletGetAssetCoinsResult,
} from "sage-app-sdk";
import {
  computeSageWalletCapabilities,
  mapSageAssetCoins,
  mapSageNetwork,
  mapSageThemeToNextTheme,
  mapSageTransactions,
  SAGE_OPTIONAL_CAPABILITIES,
  SAGE_REQUIRED_CAPABILITIES,
} from "./sageMappers";

function networkResult(overrides: Partial<EnvironmentGetNetworkResult>): EnvironmentGetNetworkResult {
  return {
    name: "Mainnet",
    networkId: "mainnet",
    kind: "mainnet",
    ticker: "XCH",
    prefix: "xch",
    precision: 12,
    ...overrides,
  };
}

describe("mapSageNetwork", () => {
  it("maps kind mainnet directly", () => {
    expect(mapSageNetwork(networkResult({ kind: "mainnet", networkId: "mainnet" }))).toBe(
      "mainnet"
    );
  });

  it("maps kind testnet directly", () => {
    expect(mapSageNetwork(networkResult({ kind: "testnet", networkId: "testnet11" }))).toBe(
      "testnet"
    );
  });

  it("falls back to sniffing networkId when kind is unknown", () => {
    expect(mapSageNetwork(networkResult({ kind: "unknown", networkId: "testnet11" }))).toBe(
      "testnet"
    );
    expect(mapSageNetwork(networkResult({ kind: "unknown", networkId: "mainnet" }))).toBe(
      "mainnet"
    );
  });
});

describe("computeSageWalletCapabilities", () => {
  it("is fully disabled with no granted capabilities", () => {
    expect(computeSageWalletCapabilities([])).toEqual({
      createOffer: false,
      takeOffer: false,
      cancelOffer: false,
      sendXch: false,
      signCoinSpends: false,
      signMessage: false,
      switchNetwork: false,
    });
  });

  it("enables sendXch/signCoinSpends/signMessage once granted; offers stay false without get_asset_coins", () => {
    const granted = ["wallet.send_xch", "wallet.sign_coin_spends", "wallet.sign_message"];
    expect(computeSageWalletCapabilities(granted)).toEqual({
      createOffer: false,
      takeOffer: false,
      cancelOffer: false,
      sendXch: true,
      signCoinSpends: true,
      signMessage: true,
      switchNetwork: false,
    });
  });

  it("enables createOffer once sign_coin_spends + get_asset_coins are both granted", () => {
    const granted = ["wallet.sign_coin_spends", "wallet.get_asset_coins"];
    const capabilities = computeSageWalletCapabilities(granted);
    expect(capabilities.createOffer).toBe(true);
    expect(capabilities.takeOffer).toBe(false);
    expect(capabilities.cancelOffer).toBe(false);
  });

  it("enables takeOffer/cancelOffer only once send_transaction is granted too", () => {
    const granted = ["wallet.sign_coin_spends", "wallet.get_asset_coins", "wallet.send_transaction"];
    const capabilities = computeSageWalletCapabilities(granted);
    expect(capabilities.createOffer).toBe(true);
    expect(capabilities.takeOffer).toBe(true);
    expect(capabilities.cancelOffer).toBe(true);
  });

  it("switchNetwork is always false regardless of granted capabilities", () => {
    const granted = ["wallet.sign_coin_spends", "wallet.get_asset_coins", "wallet.send_transaction"];
    expect(computeSageWalletCapabilities(granted).switchNetwork).toBe(false);
  });
});

describe("mapSageAssetCoins", () => {
  it("maps snake_case coin fields and converts amounts to numbers", () => {
    const result: WalletGetAssetCoinsResult = [
      {
        coin: { parent_coin_info: "0xparent", puzzle_hash: "0xpuzzle", amount: "1000000000000" },
        coinName: "0xcoinname",
        puzzle: "0xpuzzlereveal",
        confirmedBlockIndex: 42,
        locked: false,
        lineageProof: { parentName: "0xlineageparent", innerPuzzleHash: "0xinner", amount: "5" },
      },
    ];

    expect(mapSageAssetCoins(result)).toEqual([
      {
        coin: { parent_coin_info: "0xparent", puzzle_hash: "0xpuzzle", amount: 1000000000000 },
        coinName: "0xcoinname",
        puzzle: "0xpuzzlereveal",
        confirmedBlockIndex: 42,
        locked: false,
        lineageProof: { parentName: "0xlineageparent", innerPuzzleHash: "0xinner", amount: 5 },
      },
    ]);
  });

  it("defaults a missing lineage proof instead of passing null through", () => {
    const result: WalletGetAssetCoinsResult = [
      {
        coin: { parent_coin_info: "0xparent", puzzle_hash: "0xpuzzle", amount: 1000 },
        coinName: "0xcoinname",
        puzzle: "0xpuzzlereveal",
        confirmedBlockIndex: 1,
        locked: false,
        lineageProof: null,
      },
    ];

    expect(mapSageAssetCoins(result)[0].lineageProof).toEqual({
      parentName: "",
      innerPuzzleHash: "",
      amount: 0,
    });
  });
});

describe("mapSageTransactions", () => {
  it("uses height as the transaction id (Sage has no standalone id)", () => {
    const result: GetTransactionsResponse = {
      transactions: [
        { height: 1234, timestamp: 1_700_000_000, spent: [], created: [] },
        { height: 1235, timestamp: null, spent: [], created: [] },
      ],
      total: 2,
    };

    expect(mapSageTransactions(result)).toEqual([
      { transactionId: "1234", height: 1234, timestamp: 1_700_000_000, spent: [], created: [] },
      { transactionId: "1235", height: 1235, timestamp: null, spent: [], created: [] },
    ]);
  });
});

describe("mapSageThemeToNextTheme", () => {
  function theme(overrides: Partial<EnvironmentThemeView>): EnvironmentThemeView {
    return { name: "custom", displayName: "Custom", cssVars: {}, ...overrides };
  }

  it("prefers the mostLike hint", () => {
    expect(mapSageThemeToNextTheme(theme({ mostLike: "light" }))).toBe("light");
    expect(mapSageThemeToNextTheme(theme({ mostLike: "dark" }))).toBe("dark");
  });

  it("sniffs the theme name when mostLike is absent", () => {
    expect(mapSageThemeToNextTheme(theme({ name: "solar-light", displayName: "Solar Light" }))).toBe(
      "light"
    );
  });

  it("defaults to dark, Pengui's own default theme", () => {
    expect(mapSageThemeToNextTheme(theme({ name: "midnight", displayName: "Midnight" }))).toBe(
      "dark"
    );
  });
});

describe("capability lists", () => {
  it("required and optional capability lists do not overlap", () => {
    const overlap = SAGE_REQUIRED_CAPABILITIES.filter((c) =>
      (SAGE_OPTIONAL_CAPABILITIES as readonly string[]).includes(c)
    );
    expect(overlap).toEqual([]);
  });
});
