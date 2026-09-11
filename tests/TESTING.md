# Testing Strategy

This is the canonical testing guide for the repository.

If another test document disagrees with this one, treat this file as the source of truth.

## Goals

The suite should answer three different questions:

1. Does isolated logic behave correctly?
2. Does the application behave correctly under stable, deterministic user flows?
3. Can the application later be proven against a real wallet and real chain environment?

Those questions should be handled by different layers.

## Current Policy

From unit through ordinary E2E, tests should run on mocked or deterministic data.

That means:

- no real funded wallet
- no real chain broadcast
- no real testnet or mainnet state dependency

Today, some deterministic regression flows still use the real WalletConnect relay transport to pair the mock wallet. That is an implementation detail of the current harness, not a reason to treat those tests as live-wallet coverage.

The live-wallet layers are separate and are not part of the default suite yet.

## Test Layers

| Layer              | Scope                                          | Trigger                          | Data model           | Purpose                                                            |
| ------------------ | ---------------------------------------------- | -------------------------------- | -------------------- | ------------------------------------------------------------------ |
| Unit               | Pure functions, helpers, reducers, transforms  | Every PR                         | Mocked/deterministic | Fast correctness checks                                            |
| Integration        | App modules wired together below browser level | Every PR                         | Mocked/deterministic | Validate module boundaries and app-side flow logic                 |
| Smoke              | Critical browser checks                        | Every PR                         | Mocked/deterministic | Fast app health checks                                             |
| Regression         | Known bug scenarios                            | Every PR                         | Mocked/deterministic | Prevent bug reintroduction                                         |
| Acceptance         | Browser-level user behavior                    | Every PR and pre-release         | Mocked/deterministic | Validate user-facing app flows without live infrastructure         |
| E2E                | Full browser flow through running Pengui       | Main branch and pre-release runs | Mocked/deterministic | Validate rendering, routing, modal flow, and app wiring            |
| `e2e-testnet-live` | Real wallet plus real testnet                  | Manual dispatch and weekly schedule (`testnet-live.yml`) | Live       | Validate real WalletConnect and testnet chain behavior             |
| `e2e-mainnet-live` | Real wallet plus real mainnet                  | Manual only, if ever enabled     | Live                 | Validate production-like wallet integration with strict safeguards |

## Current State

What exists now:

- unit and integration tests via `bun test`
- Playwright suites under `tests/e2e`
- smoke, regression, acceptance, and other browser coverage using mocked or deterministic wallet behavior
- Playwright component tests (`tests/ct`) and Sage snapshot checks (`tests/sage`)
- a mock Sage host (`src/test-utils/mocks/sageBridge.ts`) for the in-Sage wallet path in unit and component tests

- `e2e-testnet-live` (`tests/e2e-testnet-live`, `bun run test:e2e:testnet-live`): the app against
  a real, funded testnet11 wallet through a WalletConnect wallet peer that derives its key from
  `TESTNET_WALLET_MNEMONIC`, reads coins from a testnet11 full node, signs with real BLS keys and
  broadcasts. Manual dispatch and a weekly schedule only (`.github/workflows/testnet-live.yml`);
  never part of `bun run test:e2e`.

What does not exist yet:

- a production-ready minimal WalletConnect wallet runtime for the mocked tiers (the live peer is
  the first real signing runtime; `WALLET_RUNTIME_IMPLEMENTATION_SPEC.md` still describes the
  fixture-mode design)
- live offer create/cancel through the UI (the live peer implements the RPCs; no test drives them)
- any mainnet live automation

## Required Boundary

Ordinary integration and E2E are not live-wallet tests.

They should stay:

- deterministic
- fast enough for regular CI
- isolated from live relay and live chain behavior
- maintainable without wallet operational setup

Real wallet, real funds, and real chain behavior belong only in the dedicated live layers:

- [`E2E_TESTNET_LIVE_SPEC.md`](./E2E_TESTNET_LIVE_SPEC.md)
- [`E2E_MAINNET_LIVE_SPEC.md`](./E2E_MAINNET_LIVE_SPEC.md)

## Integration Definition

Integration tests in this repository should verify multiple app parts working together in a controlled environment.

They should cover things like:

- state and hook interaction
- component-to-service boundaries
- WalletConnect-facing app logic using mocked or fixture-backed adapters
- send and offer flow orchestration from the app point of view
- error and loading state behavior

They should not require:

- a real funded wallet
- a real WalletConnect wallet peer
- live relay connectivity
- real blockchain confirmation

If a future real wallet runtime is implemented, it can unlock a new higher-fidelity test layer. That work is separate and is specified in [`WALLET_RUNTIME_IMPLEMENTATION_SPEC.md`](./WALLET_RUNTIME_IMPLEMENTATION_SPEC.md). It is not the definition of the current integration suite.

## E2E Definition

Ordinary E2E tests are browser-driven tests of the running Pengui application with deterministic data and controlled wallet behavior.

They should own:

- browser navigation
- page rendering
- route transitions
- modal visibility
- interaction between app shell, state, and mocked wallet-facing boundaries

They should not be the default place to prove:

- real wallet approval
- real transaction signing
- real offer lifecycle on chain
- live relay behavior

## Live E2E Naming

Use these names for future live suites:

- `e2e-testnet-live`
- `e2e-mainnet-live`

Do not use ordinary `integration` or ordinary `e2e` to mean real-wallet funded tests.

Alternative descriptive language is also acceptable in prose:

- testnet integration
- system tests
- live E2E

## Current E2E Structure

```text
tests/e2e/
├── smoke/
├── regression/
├── acceptance/
├── fixtures/
├── page-objects/
└── wallet-mock/
```

Interpretation for now:

- `smoke` stays fast and unauthenticated
- `regression` is the deterministic authenticated WalletConnect layer, with a worker-scoped mock wallet client and explicit auth setup per test page
- `acceptance` stays mostly unauthenticated and should only take auth setup when a user story actually needs it
- the former transitional `testnet` tier and its manual workflow were removed; nothing in `tests/e2e` touches real testnet state
- live suites should be introduced later under explicit `e2e-testnet-live` and `e2e-mainnet-live` planning

## Related Specs

- [`WALLET_RUNTIME_IMPLEMENTATION_SPEC.md`](./WALLET_RUNTIME_IMPLEMENTATION_SPEC.md): future wallet runtime dependency for higher-fidelity flows
- [`E2E_TESTNET_LIVE_SPEC.md`](./E2E_TESTNET_LIVE_SPEC.md): implementation spec for real funded testnet live E2E
- [`E2E_MAINNET_LIVE_SPEC.md`](./E2E_MAINNET_LIVE_SPEC.md): implementation spec for real funded mainnet live E2E
