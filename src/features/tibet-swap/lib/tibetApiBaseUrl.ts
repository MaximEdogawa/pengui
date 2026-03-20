const DEFAULT_TIBET_API_URL = "https://api.v2.tibetswap.io";

/**
 * Tibet Swap v2 API base URL. Values come from `NEXT_PUBLIC_TIBET_*` in `.env`.
 * Lives under the feature to avoid Turbopack mis-linking shared `networkUtils`.
 */
export function getTibetApiBaseUrl(network: "mainnet" | "testnet"): string {
  if (network === "testnet") {
    return (
      process.env.NEXT_PUBLIC_TIBET_TESTNET_API_URL ||
      process.env.NEXT_PUBLIC_TIBET_API_URL ||
      DEFAULT_TIBET_API_URL
    );
  }
  return (
    process.env.NEXT_PUBLIC_TIBET_MAINNET_API_URL ||
    process.env.NEXT_PUBLIC_TIBET_API_URL ||
    DEFAULT_TIBET_API_URL
  );
}
