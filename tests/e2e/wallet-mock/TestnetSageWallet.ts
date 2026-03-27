/**
 * TestnetSageWallet
 *
 * A WalletConnect wallet peer that uses a REAL testnet wallet address and
 * fingerprint, and checks on-chain balance before tests run.
 *
 * Unlike SageMockWallet (which uses deterministic fixture data), this wallet
 * extends the mock with:
 *  • Real wallet address (from TESTNET_WALLET_ADDRESS env var)
 *  • Real wallet fingerprint (from TESTNET_WALLET_FINGERPRINT env var)
 *  • Real XCH balance fetched from SpaceScan testnet11 API
 *  • Funding gate — skips tests if wallet has no balance, or polls until funded
 *
 * Required env vars (store as CI/GitHub secrets):
 *   TESTNET_WALLET_ADDRESS       txch1... address of the testnet wallet
 *   TESTNET_WALLET_FINGERPRINT   Integer fingerprint shown in Sage Wallet UI
 *
 * Optional env vars:
 *   TESTNET_WALLET_MNEMONIC      Seed phrase (reserved for future tx signing)
 *   TESTNET_MIN_BALANCE_MOJOS    Minimum mojos required (default: 1_000_000)
 *   TESTNET_WAIT_FOR_FUNDING     "true" to poll until funded (default: false)
 *   TESTNET_FUNDING_TIMEOUT_MS   Poll timeout in ms (default: 600_000 = 10 min)
 *   TESTNET_SPACESCAN_API_URL    Override SpaceScan API base URL
 *
 * Usage
 * ─────
 * The `testnetConnectedPage` fixture in tests/e2e/fixtures/index.ts handles
 * all setup — tests just use `{ testnetConnectedPage }`:
 *
 *   test("real balance shown", async ({ testnetConnectedPage, currentBalance }) => {
 *     await expect(testnetConnectedPage.getByText(/txch/i)).toBeVisible();
 *   });
 *
 * How to set up the test wallet
 * ──────────────────────────────
 * 1. Install Sage Wallet, create a NEW mnemonic (never use on mainnet).
 * 2. Switch to testnet (Settings → Network → Testnet11).
 * 3. Note the wallet address (starts with txch1…) and fingerprint.
 * 4. Fund from faucet: https://testnet11.chia.net/faucet (request 1 TXCH).
 * 5. Set CI secrets: TESTNET_WALLET_ADDRESS, TESTNET_WALLET_FINGERPRINT.
 * 6. Optionally set TESTNET_WALLET_MNEMONIC for future signing support.
 */

/* eslint-disable no-console */

import { SageMockWallet } from "./SageMockWallet";
import { mockResponses } from "./responses";
import { fetchTestnetBalance, waitForFunding, type XchBalance } from "./ChiaTestnetApi";

export interface TestnetWalletConfig {
  /** txch1... address of the funded testnet wallet. */
  address: string;
  /** Integer fingerprint from Sage Wallet UI. */
  fingerprint: number;
  /** Minimum mojos required to run funded tests (default 1_000_000 = 0.000001 XCH). */
  minBalanceMojos: bigint;
  /** When true, poll until funded instead of skipping immediately. */
  waitForFunding: boolean;
  /** Poll timeout in ms when waitForFunding is true. */
  fundingTimeoutMs: number;
}

/** Read testnet wallet config from environment variables. */
export function readTestnetWalletConfig(): TestnetWalletConfig | null {
  const address = process.env.TESTNET_WALLET_ADDRESS?.trim();
  const fpStr = process.env.TESTNET_WALLET_FINGERPRINT?.trim();

  if (!address || !fpStr) return null;

  const fingerprint = parseInt(fpStr, 10);
  if (isNaN(fingerprint)) {
    console.warn(
      `[TestnetSageWallet] TESTNET_WALLET_FINGERPRINT "${fpStr}" is not a valid integer — skipping testnet tests.`
    );
    return null;
  }

  return {
    address,
    fingerprint,
    minBalanceMojos: process.env.TESTNET_MIN_BALANCE_MOJOS
      ? BigInt(process.env.TESTNET_MIN_BALANCE_MOJOS)
      : BigInt(1_000_000),
    waitForFunding: process.env.TESTNET_WAIT_FOR_FUNDING === "true",
    fundingTimeoutMs: process.env.TESTNET_FUNDING_TIMEOUT_MS
      ? parseInt(process.env.TESTNET_FUNDING_TIMEOUT_MS, 10)
      : 600_000,
  };
}

/**
 * TestnetSageWallet
 *
 * Extends SageMockWallet with a real testnet address/fingerprint and
 * on-chain balance data.  All 17 Sage RPC methods still return fixture data
 * except for methods that expose wallet identity:
 *   • chia_getAddress        → returns real TESTNET_WALLET_ADDRESS
 *   • chip0002_connect       → returns real address + fingerprint
 *   • chip0002_getAssetBalance → returns real on-chain XCH balance (in mojos)
 */
export class TestnetSageWallet extends SageMockWallet {
  private readonly config: TestnetWalletConfig;
  private cachedBalance: XchBalance = { mojos: BigInt(0), xch: 0 };

  constructor(config: TestnetWalletConfig) {
    // Use chia:testnet chain so the dApp recognises this as a testnet session.
    super("chia:testnet");
    this.config = config;
  }

  /** Real testnet address (overrides mock). */
  override get address(): string {
    return this.config.address;
  }

  /** Real testnet fingerprint (overrides mock). */
  override get fingerprint(): number {
    return this.config.fingerprint;
  }

  /**
   * Check on-chain balance.
   * If the wallet has insufficient funds:
   *   • waitForFunding = true  → poll until funded (useful for local dev)
   *   • waitForFunding = false → returns null (test fixture should skip)
   *
   * Returns the balance if funded, null if not.
   */
  async checkFunding(): Promise<XchBalance | null> {
    const { address, minBalanceMojos, waitForFunding: shouldWait, fundingTimeoutMs } = this.config;

    if (shouldWait) {
      const balance = await waitForFunding(address, minBalanceMojos, fundingTimeoutMs);
      if (balance.mojos >= minBalanceMojos) {
        this.cachedBalance = balance;
        return balance;
      }
      console.warn(
        `[TestnetSageWallet] Wallet still unfunded after ${fundingTimeoutMs / 1000}s — skipping.`
      );
      return null;
    }

    const balance = await fetchTestnetBalance(address);
    if (balance.mojos >= minBalanceMojos) {
      this.cachedBalance = balance;
      return balance;
    }

    console.log(
      `[TestnetSageWallet] Wallet ${address} has ${balance.xch} TXCH — below minimum ` +
        `${Number(minBalanceMojos) / 1e12} TXCH.\n` +
        `Fund at https://testnet11.chia.net/faucet and re-run, or set TESTNET_WAIT_FOR_FUNDING=true.`
    );
    return null;
  }

  /**
   * Build the WalletConnect responses for this request, mixing real identity
   * data with fixture responses for everything else.
   */
  protected override buildResponse(method: string): unknown {
    const realBalanceMojos = this.cachedBalance.mojos.toString();

    switch (method) {
      case "chia_getAddress":
        return {
          success: true,
          address: this.config.address,
          walletId: 1,
        };

      case "chip0002_connect":
        return {
          success: true,
          fingerprint: this.config.fingerprint,
          address: this.config.address,
        };

      case "chip0002_getAssetBalance":
        // Return real XCH balance in mojos (string format as the app expects).
        // CAT balance queries also hit this method — return 0 for them since
        // the request params include assetId.  The mock doesn't inspect params,
        // so all balance queries return the XCH value; that's acceptable for UI tests.
        return {
          confirmed: realBalanceMojos,
          spendable: realBalanceMojos,
          spendableCoinCount: 1,
        };

      default:
        return (
          mockResponses[method] ?? {
            success: false,
            error: `TestnetSageWallet: no fixture response for method "${method}"`,
          }
        );
    }
  }
}
