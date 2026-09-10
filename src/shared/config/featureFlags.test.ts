import { describe, it, expect, afterEach } from "bun:test";
import {
  DEFAULT_FEATURE_FLAGS,
  isFeatureEnabled,
  getFeatureFlags,
  parseFeatureFlags,
} from "./featureFlags";

/**
 * The Trading page ships everywhere; the swap / add liquidity / remove liquidity
 * UI has its own flag and is off unless a flag list names it, because TibetSwap
 * - the AMM behind it - is winding down.
 */
const TRADING_FLAG = "trading" as const;
const SWAP_FLAG = "swap" as const;

/** Flag strings the different Pengui environments build with. */
const ENVIRONMENT_FLAG_STRINGS: Array<[string, string | undefined]> = [
  ["local (.env.example)", "dashboard,offers,trading,loans,optionContracts,piggyBank,wallet"],
  ["deployment (deployment/.env.example)", "dashboard,offers,trading,wallet"],
  ["build arg not passed (empty string)", ""],
  ["whitespace only", "   "],
  ["env var unset", undefined],
];

const originalRaw = process.env.NEXT_PUBLIC_FEATURE_FLAGS;

function setRaw(raw: string | undefined) {
  if (raw === undefined) {
    delete process.env.NEXT_PUBLIC_FEATURE_FLAGS;
  } else {
    process.env.NEXT_PUBLIC_FEATURE_FLAGS = raw;
  }
}

describe("parseFeatureFlags", () => {
  it.each(ENVIRONMENT_FLAG_STRINGS)("enables trading for %s", (_label, raw) => {
    expect(parseFeatureFlags(raw).has(TRADING_FLAG)).toBe(true);
  });

  it.each(ENVIRONMENT_FLAG_STRINGS)("leaves swap disabled for %s", (_label, raw) => {
    expect(parseFeatureFlags(raw).has(SWAP_FLAG)).toBe(false);
  });

  it("enables swap only when a flag list names it explicitly", () => {
    expect(parseFeatureFlags("dashboard,trading,swap").has(SWAP_FLAG)).toBe(true);
  });

  it("falls back to the documented baseline when unset or blank", () => {
    const baseline = [...DEFAULT_FEATURE_FLAGS].map((f) => f.toLowerCase()).sort();
    for (const raw of [undefined, "", "  ", ",, ,"]) {
      expect([...parseFeatureFlags(raw)].sort()).toEqual(baseline);
    }
  });

  it("honours an explicit list exactly, so features can still be turned off", () => {
    const flags = parseFeatureFlags("dashboard,wallet");
    expect(flags.has("dashboard")).toBe(true);
    expect(flags.has(TRADING_FLAG)).toBe(false);
  });

  it("tolerates casing and surrounding whitespace", () => {
    const flags = parseFeatureFlags(" Dashboard , TRADING ,piggyBank , Swap ");
    expect(flags.has(TRADING_FLAG)).toBe(true);
    expect(flags.has(SWAP_FLAG)).toBe(true);
    expect(flags.has("piggybank")).toBe(true);
  });
});

describe("isFeatureEnabled", () => {
  afterEach(() => {
    setRaw(originalRaw);
  });

  it.each(ENVIRONMENT_FLAG_STRINGS)("reports trading enabled, swap disabled for %s", (_l, raw) => {
    setRaw(raw);
    expect(isFeatureEnabled(TRADING_FLAG)).toBe(true);
    expect(isFeatureEnabled(SWAP_FLAG)).toBe(false);
    expect(getFeatureFlags().trading).toBe(true);
    expect(getFeatureFlags().swap).toBe(false);
  });

  it("re-reads the env var when it changes", () => {
    setRaw("dashboard,offers,trading,wallet");
    expect(isFeatureEnabled(TRADING_FLAG)).toBe(true);
    expect(isFeatureEnabled(SWAP_FLAG)).toBe(false);
    setRaw("dashboard,trading,swap");
    expect(isFeatureEnabled(SWAP_FLAG)).toBe(true);
    setRaw("dashboard");
    expect(isFeatureEnabled(TRADING_FLAG)).toBe(false);
  });
});
