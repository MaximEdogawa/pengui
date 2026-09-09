import { describe, it, expect, afterEach } from "bun:test";
import { getTibetApiBaseUrl } from "./tibetApiBaseUrl";

const TIBET_VARS = [
  "NEXT_PUBLIC_TIBET_API_URL",
  "NEXT_PUBLIC_TIBET_MAINNET_API_URL",
  "NEXT_PUBLIC_TIBET_TESTNET_API_URL",
] as const;

type TibetVar = (typeof TIBET_VARS)[number];

const original = Object.fromEntries(TIBET_VARS.map((k) => [k, process.env[k]])) as Record<
  TibetVar,
  string | undefined
>;

function setVar(key: TibetVar, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

function clearTibetVars() {
  for (const key of TIBET_VARS) setVar(key, undefined);
}

describe("getTibetApiBaseUrl", () => {
  afterEach(() => {
    for (const key of TIBET_VARS) setVar(key, original[key]);
  });

  it("resolves a usable base URL on both networks when no env var is configured", () => {
    // Deployed images inline these at build time; when the build arg is missing
    // the swap feature must still reach Tibet instead of falling back to a
    // relative URL. Tibet v2 serves mainnet and testnet from the same endpoint.
    clearTibetVars();
    for (const network of ["mainnet", "testnet"] as const) {
      expect(getTibetApiBaseUrl(network)).toBe("https://api.v2.tibetswap.io");
    }
  });

  it("falls back to the shared NEXT_PUBLIC_TIBET_API_URL for both networks", () => {
    clearTibetVars();
    setVar("NEXT_PUBLIC_TIBET_API_URL", "https://tibet.example");
    expect(getTibetApiBaseUrl("mainnet")).toBe("https://tibet.example");
    expect(getTibetApiBaseUrl("testnet")).toBe("https://tibet.example");
  });

  it("prefers the per-network override when set", () => {
    clearTibetVars();
    setVar("NEXT_PUBLIC_TIBET_API_URL", "https://tibet.example");
    setVar("NEXT_PUBLIC_TIBET_MAINNET_API_URL", "https://mainnet.example");
    setVar("NEXT_PUBLIC_TIBET_TESTNET_API_URL", "https://testnet.example");
    expect(getTibetApiBaseUrl("mainnet")).toBe("https://mainnet.example");
    expect(getTibetApiBaseUrl("testnet")).toBe("https://testnet.example");
  });
});
