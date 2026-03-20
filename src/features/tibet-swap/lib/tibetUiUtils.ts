/** True if ticker is native XCH (mainnet or testnet). */
export function isXchTicker(ticker: string | null): boolean {
  const c = (ticker ?? "").toLowerCase();
  return c === "xch" || c === "txch";
}
