# E2E Tests

This directory contains the Playwright browser suite.

Use [`tests/TESTING.md`](../TESTING.md) for the full testing strategy and runtime plan.

## Directory Map

```text
tests/e2e/
├── smoke/
├── regression/
├── acceptance/
├── fixtures/
├── page-objects/
└── wallet-mock/
```

## Intent

- `smoke`: basic page health
- `regression`: authenticated WalletConnect browser coverage with deterministic mocks
- `acceptance`: unauthenticated user behavior

The former `testnet/` tier (transitional flows against a mock wallet with real testnet secrets)
was removed together with its `testnet.yml` workflow; live-wallet suites are specified separately
below.

## Important Note

The canonical policy is:

- ordinary E2E remains mocked or deterministic
- live-wallet suites are separate and not part of the default run

Use these names for future live suites:

- [`E2E_TESTNET_LIVE_SPEC.md`](../E2E_TESTNET_LIVE_SPEC.md)
- [`E2E_MAINNET_LIVE_SPEC.md`](../E2E_MAINNET_LIVE_SPEC.md)
