# E2E Testnet Live Spec

This document is the implementation spec for `e2e-testnet-live`.

It is a future live-wallet suite. It is not part of the default test run.

## Purpose

`e2e-testnet-live` exists to prove behavior that mocked and deterministic tests cannot prove:

- real WalletConnect session approval
- real funded wallet behavior
- real testnet balance visibility
- real signing
- real chain-side transaction and offer behavior

## Non-Goals

This suite should not:

- run on every PR
- replace smoke, regression, acceptance, or ordinary E2E
- become the first line of failure detection for UI regressions

## Required Components

The suite needs:

- running Pengui application
- Sage Wallet Web or another approved real wallet frontend
- real WalletConnect project id
- dedicated funded testnet wallet
- testnet credentials isolated for automation
- Playwright orchestration for both applications
- cleanup scripts for test wallet state where possible

## Environment Contract

Required environment variables:

- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`
- `TESTNET_WALLET_ADDRESS`
- `TESTNET_WALLET_FINGERPRINT`
- `TESTNET_WALLET_MNEMONIC` or equivalent signing secret
- `TESTNET_FAUCET_TOP_UP_ENABLED` optional
- `TESTNET_EXPECTED_NETWORK` set to `testnet`

No mainnet credentials may be used in this suite.

## Suite Naming

Use the explicit suite name:

- `e2e-testnet-live`

Do not refer to it as ordinary integration or ordinary E2E in code or CI naming.

## High-Value Scenarios

Required first scenarios:

1. Connect Pengui to the live testnet wallet through WalletConnect.
2. Display the funded wallet address and balance.
3. Submit a small live TXCH transfer.
4. Create a live offer.
5. Cancel a live offer.
6. Verify Dexie upload or equivalent external visibility for an uploaded offer.

Support scenarios:

1. Insufficient balance handling with a constrained funded wallet.
2. Invalid recipient validation.
3. Session disconnect and reconnect.
4. Network mismatch detection.

## Operational Rules

- use a dedicated automation wallet only
- cap transfer amounts tightly
- cap daily or per-run spend
- avoid running concurrent jobs against the same wallet
- record transaction and offer ids for cleanup and audit
- fail fast if the wallet is underfunded

## Process Topology

```text
Playwright
├── Pengui app
└── Sage Wallet Web
```

The browser automation must be able to:

- retrieve or receive the WalletConnect URI
- hand that URI to the wallet
- approve the session in the wallet UI
- continue signing flows when Pengui requests them

## CI Position

Do not include this suite in `bun run test:e2e` or the default CI workflow.

If enabled later, run it only via:

- manual dispatch
- scheduled nightly or less frequent jobs
- isolated environment protection rules

## Acceptance Criteria

The implementation ticket should not be considered complete until:

1. the suite can start both applications deterministically
2. the suite can connect a real funded testnet wallet
3. the suite can complete at least one real signed transfer
4. the suite can complete at least one real offer create and cancel flow
5. failures leave enough logs and identifiers to debug wallet or chain issues

## Dependencies

- [`TESTING.md`](/Users/leo-private/Projects/chia/pengui/tests/TESTING.md)
- [`WALLET_RUNTIME_IMPLEMENTATION_SPEC.md`](/Users/leo-private/Projects/chia/pengui/tests/WALLET_RUNTIME_IMPLEMENTATION_SPEC.md)
- [`WALLET_RUNTIME_UPSTREAM_NOTES.md`](/Users/leo-private/Projects/chia/pengui/tests/WALLET_RUNTIME_UPSTREAM_NOTES.md)
