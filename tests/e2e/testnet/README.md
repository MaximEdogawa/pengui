# Testnet E2E Tests

This directory contains the testnet-specific Playwright suite.

## Current Model

The current suite is Phase 1:

- real testnet wallet address and fingerprint
- live balance fetched from testnet infrastructure
- WalletConnect session still approved by `TestnetSageWallet`, which is a mock wallet peer
- transaction and offer signing are not real yet

## File Layout

```text
tests/e2e/testnet/
├── wallet-connect.spec.ts
├── transactions.spec.ts
├── offers.spec.ts
└── edge-cases.spec.ts
```

## Status

- `wallet-connect.spec.ts`: active
- `transactions.spec.ts`: active, but send flow is still mock-signed
- `offers.spec.ts`: scaffolded, blocked on real signing / reliable Dexie verification
- `edge-cases.spec.ts`: partial, with blocked cases called out explicitly

## Handoff

Before expanding this suite, read:

- [`tests/TESTNET_IMPLEMENTATION_STATUS.md`](/Users/leo-private/Projects/chia/pengui/tests/TESTNET_IMPLEMENTATION_STATUS.md)
- [`tests/TESTNET_INTEGRATION_STRATEGY.md`](/Users/leo-private/Projects/chia/pengui/tests/TESTNET_INTEGRATION_STRATEGY.md)
