/**
 * Fixture responses for all 17 Sage Wallet methods.
 *
 * These are returned by SageMockWallet when the dApp makes WalletConnect
 * RPC requests during E2E tests.  Values are realistic-looking but fake —
 * they never touch the Chia blockchain.
 *
 * Response shapes mirror the types in:
 *   src/shared/lib/walletConnect/types/command.types.ts
 *   src/shared/lib/walletConnect/types/walletConnect.types.ts
 */

export const MOCK = {
  /** A walletId fingerprint the dApp will store in Redux after pairing. */
  FINGERPRINT: 987_654_321,

  /** The wallet address returned by chia_getAddress. */
  ADDRESS: "xch1qyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqy4qwm2s",

  /** Default chain — tests run in mainnet mode. */
  CHAIN_ID: "chia:mainnet",

  /** Fake transaction ID (64-char hex). */
  TX_ID: `0x${"ab12cd34".repeat(8)}`,

  /** Fake trade / offer ID (64-char hex). */
  TRADE_ID: "ef56gh78".repeat(8),

  /** Fake BLS signature (192 hex chars). */
  SIG: `0x${"a1b2c3d4".repeat(24)}`,

  /** Fake BLS public key (96 hex chars). */
  PUBLIC_KEY: `0x${"b2c3d4e5".repeat(12)}`,

  /**
   * Fake offer string.  Real offer strings are bech32-encoded CLVM programs
   * starting with "offer1"; this is a recognisable placeholder.
   */
  OFFER_STR: `offer1qvszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqmocktest${"x".repeat(150)}`,
} as const;

/**
 * Pre-built responses keyed by Sage method name.
 *
 * The dApp's processWalletRequestResult() accepts several shapes:
 *   • { success: true, ...data }   → treated as success, data = result
 *   • { ...data }                  → treated as success (no error key)
 *   • { success: false, error }    → treated as failure
 *
 * We use `{ success: true, ...data }` throughout so the dApp's
 * success-path is exercised.
 */
export const mockResponses: Record<string, unknown> = {
  // ── CHIP-0002 ──────────────────────────────────────────────────────────────

  chip0002_connect: {
    success: true,
    fingerprint: MOCK.FINGERPRINT,
    address: MOCK.ADDRESS,
  },

  chip0002_chainId: {
    chainId: MOCK.CHAIN_ID,
  },

  chip0002_getPublicKeys: {
    publicKeys: [{ walletId: 1, publicKey: MOCK.PUBLIC_KEY }],
  },

  chip0002_filterUnlockedCoins: { coins: [] },

  chip0002_getAssetCoins: { coins: [] },

  /** Balance in mojos (string).  5 XCH = 5_000_000_000_000 mojos. */
  chip0002_getAssetBalance: {
    confirmed: "5000000000000",
    spendable: "5000000000000",
    spendableCoinCount: 1,
  },

  chip0002_signCoinSpends: { signedCoinSpends: [] },

  chip0002_signMessage: {
    success: true,
    signature: MOCK.SIG,
    message: "",
    address: MOCK.ADDRESS,
  },

  chip0002_sendTransaction: {
    success: true,
    transactionId: MOCK.TX_ID,
    transaction: {},
  },

  // ── Chia-specific ──────────────────────────────────────────────────────────

  chia_createOffer: {
    success: true,
    offer: MOCK.OFFER_STR,
    tradeId: MOCK.TRADE_ID,
    id: MOCK.TRADE_ID,
  },

  chia_takeOffer: {
    success: true,
    tradeId: MOCK.TRADE_ID,
  },

  chia_cancelOffer: { success: true },

  chia_getNfts: { nfts: [] },

  chia_send: {
    success: true,
    transactionId: MOCK.TX_ID,
    transaction: {},
  },

  chia_getAddress: {
    success: true,
    address: MOCK.ADDRESS,
    walletId: 1,
  },

  chia_signMessageByAddress: {
    success: true,
    signature: MOCK.SIG,
    message: "",
    address: MOCK.ADDRESS,
  },

  chia_bulkMintNfts: {
    nftIds: [],
    transactionId: MOCK.TX_ID,
  },
};
