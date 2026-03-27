/* eslint-disable no-console */
/**
 * ChiaTestnetApi
 *
 * Lightweight HTTP client for querying Chia TESTNET11 wallet data.
 * Used by TestnetSageWallet to check funding before running authenticated tests.
 *
 * Balance API: SpaceScan testnet11 (https://api-testnet11.spacescan.io)
 *   GET /address/xch-balance/{address}
 *   → { status: "success", xch: 1.5, mojo: 1500000000000 }
 *
 * Override the base URL via TESTNET_SPACESCAN_API_URL env var if SpaceScan
 * changes subdomain again (they moved from api-testnet to api-testnet11).
 *
 * Explorer UI: https://testnet11.spacescan.io/address/{address}
 * Faucet:      https://testnet11.chia.net/faucet
 */

const DEFAULT_SPACESCAN_TESTNET_API = "https://api-testnet11.spacescan.io";

export interface XchBalance {
  /** Raw mojos (1 XCH = 1_000_000_000_000 mojos). */
  mojos: bigint;
  /** Decimal XCH value for display. */
  xch: number;
}

/**
 * Fetch the XCH balance of a testnet wallet address.
 * Returns zero if the address is unfunded, unknown, or the API is unreachable.
 */
export async function fetchTestnetBalance(address: string): Promise<XchBalance> {
  const base =
    process.env.TESTNET_SPACESCAN_API_URL ??
    process.env.NEXT_PUBLIC_SPACESCAN_TESTNET_API_URL ??
    DEFAULT_SPACESCAN_TESTNET_API;

  const url = `${base}/address/xch-balance/${address}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) return { mojos: BigInt(0), xch: 0 };

    const data = (await res.json()) as {
      status?: string;
      mojo?: number | string;
      xch?: number | string;
    };

    if (data?.status !== "success") return { mojos: BigInt(0), xch: 0 };

    // SpaceScan returns mojo as a number; use BigInt to avoid precision loss.
    const mojos = data.mojo != null ? BigInt(Math.round(Number(data.mojo))) : BigInt(0);
    const xch = data.xch != null ? Number(data.xch) : Number(mojos) / 1_000_000_000_000;
    return { mojos, xch };
  } catch {
    return { mojos: BigInt(0), xch: 0 };
  }
}

/**
 * Poll until the wallet balance reaches `minMojos`, or until `timeoutMs` elapses.
 *
 * Prints a one-time message with the faucet URL and wallet address so the
 * developer/operator knows where to send funds.
 *
 * @returns The final balance (may be zero if timed out).
 */
export async function waitForFunding(
  address: string,
  minMojos = BigInt(1_000_000), // 0.000001 XCH — just above dust
  timeoutMs = 600_000, // 10 minutes
  intervalMs = 30_000, // check every 30 s
  announced = false,
  deadline = Date.now() + timeoutMs
): Promise<XchBalance> {
  if (Date.now() >= deadline) return fetchTestnetBalance(address);

  const balance = await fetchTestnetBalance(address);
  if (balance.mojos >= minMojos) return balance;

  if (!announced) {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║         Waiting for testnet wallet funding…              ║
╠══════════════════════════════════════════════════════════╣
║  Address : ${address.padEnd(46)} ║
║  Minimum : ${`${minMojos} mojos`.padEnd(46)} ║
║  Faucet  : https://testnet11.chia.net/faucet              ║
║  Explorer: https://testnet11.spacescan.io/address/${address.slice(0, 20)}… ║
╚══════════════════════════════════════════════════════════╝
Polling every ${intervalMs / 1000} s (timeout ${timeoutMs / 60_000} min)…
`);
  }

  await new Promise((r) => setTimeout(r, intervalMs));
  return waitForFunding(address, minMojos, timeoutMs, intervalMs, true, deadline);
}
