# E2E Mainnet Live Spec

This document is the implementation spec for `e2e-mainnet-live`.

It is a future live-wallet suite. It is not part of the default test run.

## Purpose

`e2e-mainnet-live` would exist only to prove a very small number of production-like wallet interactions under tightly controlled conditions.

This suite is optional and should be treated as higher risk than `e2e-testnet-live`.

## Default Recommendation

Do not implement this suite before `e2e-testnet-live` is stable.

If the project can avoid automated mainnet live testing, that is preferable.

## Non-Goals

This suite should not:

- run on every PR
- run on schedule by default
- use normal developer wallets
- execute meaningful value transfers

## Required Safeguards

Any implementation must include:

- dedicated low-value automation wallet
- explicit environment protection
- manual approval before execution
- strict amount caps
- clear audit logging
- single-run concurrency protection
- immediate abort on network mismatch

## Minimum Scenarios

If implemented at all, start with:

1. connect a real mainnet wallet
2. confirm address visibility
3. confirm balance visibility

Avoid real transfer or offer scenarios until the team explicitly accepts the operational risk.

## CI Position

Do not include this suite in normal CI.

If ever enabled, it should be manual-only with environment protection and restricted credentials.

## Acceptance Criteria

The implementation ticket should not be considered complete until:

1. execution requires explicit manual approval
2. the wallet is provably isolated from ordinary developer usage
3. the suite cannot accidentally run against testnet or the wrong wallet
4. amount and action safeguards are enforced before any live action is possible

## Dependencies

- [`TESTING.md`](/Users/leo-private/Projects/chia/pengui/tests/TESTING.md)
- [`E2E_TESTNET_LIVE_SPEC.md`](/Users/leo-private/Projects/chia/pengui/tests/E2E_TESTNET_LIVE_SPEC.md)
