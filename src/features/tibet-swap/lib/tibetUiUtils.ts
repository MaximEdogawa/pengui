/** True if ticker is native XCH (mainnet or testnet). */
export function isXchTicker(ticker: string | null): boolean {
  const c = (ticker ?? "").toLowerCase();
  return c === "xch" || c === "txch";
}

/** Returns the display ticker for a Tibet LP token, e.g. "BYC-XCH". */
export function getLpTicker(pair: { asset_short_name: string; asset_name: string }): string {
  return `${pair.asset_short_name || pair.asset_name}-XCH`;
}
