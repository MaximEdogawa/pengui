# Live E2E Status

This file tracks readiness for the future live-wallet suites described in:

- [`E2E_TESTNET_LIVE_SPEC.md`](/Users/leo-private/Projects/chia/pengui/tests/E2E_TESTNET_LIVE_SPEC.md)
- [`E2E_MAINNET_LIVE_SPEC.md`](/Users/leo-private/Projects/chia/pengui/tests/E2E_MAINNET_LIVE_SPEC.md)

For the canonical test taxonomy, see [`TESTING.md`](/Users/leo-private/Projects/chia/pengui/tests/TESTING.md).

## Current State

- The default test suite is still mocked and deterministic from unit through ordinary E2E.
- Real live-wallet automation does not exist yet.
- The wallet runtime described in [`WALLET_RUNTIME_IMPLEMENTATION_SPEC.md`](/Users/leo-private/Projects/chia/pengui/tests/WALLET_RUNTIME_IMPLEMENTATION_SPEC.md) does not exist yet.
- Existing `tests/e2e/testnet/` coverage is transitional and should not be treated as the final live-suite implementation.

## Not Implemented

- `e2e-testnet-live` harness
- `e2e-mainnet-live` harness
- dedicated real-wallet runtime orchestration
- Sage Wallet Web automation
- real signing
- real offer lifecycle verification
- real Dexie upload verification

## Next Steps

1. Keep the default suite mocked and deterministic.
2. Build the wallet runtime from [`WALLET_RUNTIME_IMPLEMENTATION_SPEC.md`](/Users/leo-private/Projects/chia/pengui/tests/WALLET_RUNTIME_IMPLEMENTATION_SPEC.md) in a separate ticket.
3. Implement `e2e-testnet-live` from [`E2E_TESTNET_LIVE_SPEC.md`](/Users/leo-private/Projects/chia/pengui/tests/E2E_TESTNET_LIVE_SPEC.md).
4. Treat `e2e-mainnet-live` as a stricter later phase from [`E2E_MAINNET_LIVE_SPEC.md`](/Users/leo-private/Projects/chia/pengui/tests/E2E_MAINNET_LIVE_SPEC.md).
