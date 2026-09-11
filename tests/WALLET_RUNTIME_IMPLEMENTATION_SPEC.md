# Wallet Runtime Implementation Spec

This document is the implementation spec for a future WalletConnect-capable test wallet runtime.

It is not part of the default test suite today.

## Purpose

The runtime exists as an enabling dependency for future higher-fidelity testing work.

It may later support:

- richer deterministic integration coverage
- richer deterministic authenticated browser coverage
- parts of future live-wallet orchestration

It does not redefine the current test policy in [`TESTING.md`](./TESTING.md): unit through ordinary E2E stay mocked and deterministic.

## Status

This is a specification for another implementation ticket.

The runtime does not exist yet.

## Intended Role

If implemented, the runtime should:

- act as a WalletConnect wallet peer
- run headlessly
- accept a `wc:` pairing URI from automation
- approve a WalletConnect session
- respond to the subset of Chia wallet methods Pengui actually uses
- support deterministic fixture mode first
- preserve the same public interface for a later signing mode
- shut down cleanly and deterministically

## Non-Goals

The first version does not need:

- browser UI
- desktop shell
- full Sage feature parity
- mainnet live execution
- real signing in v1
- inclusion in the current PR test suite

## Recommended Build Target

Use `chia-wallet-sdk` as the core wallet/runtime library.

Recommended runtime shape:

- long-lived process
- started by CLI
- controlled through stdin/stdout JSON lines

This keeps the process explicit, inspectable, and compatible with Playwright or other supervisors.

## Process Model

```text
test runner
├── Pengui web server
└── wallet-runtime process
    └── WalletConnect SignClient
```

The runtime should stay out of the test runner process.

That separation is important because it:

- avoids leaking WalletConnect global state
- makes teardown explicit
- reduces reinitialization churn
- keeps logs attributable to the runtime itself

## Runtime Modes

### `fixture`

This is the required first mode.

Behavior:

- deterministic address
- deterministic fingerprint
- deterministic balances
- deterministic transaction and offer responses
- no real signing
- no real broadcast

### `signing`

This is a future mode and should not block v1.

Behavior:

- real wallet identity
- real signing for supported methods
- optional real broadcast depending on the later live-suite design

The external control interface must stay identical between `fixture` and `signing`.

## CLI Contract

Recommended command shape:

```bash
bun run wallet-runtime:test --network mainnet --mode fixture
```

Future compatible forms:

```bash
bun run wallet-runtime:test --network testnet --mode fixture
bun run wallet-runtime:test --network testnet --mode signing
```

### Required flags

| Flag           | Required | Values               | Purpose                           |
| -------------- | -------- | -------------------- | --------------------------------- |
| `--network`    | Yes      | `mainnet`, `testnet` | Namespace and chain selection     |
| `--mode`       | Yes      | `fixture`, `signing` | Runtime mode                      |
| `--config`     | No       | file path            | Optional config file              |
| `--project-id` | No       | string               | WalletConnect project id override |
| `--relay-url`  | No       | url                  | Relay override                    |

## Environment Variables

| Variable                                                   | Required              | Purpose                    |
| ---------------------------------------------------------- | --------------------- | -------------------------- |
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` or `WC_PROJECT_ID` | Yes                   | WalletConnect project id   |
| `NEXT_PUBLIC_WALLET_CONNECT_RELAY_URL`                     | No                    | Relay override             |
| `TEST_WALLET_ADDRESS`                                      | Fixture mode optional | Fixed address override     |
| `TEST_WALLET_FINGERPRINT`                                  | Fixture mode optional | Fixed fingerprint override |
| `TESTNET_WALLET_MNEMONIC`                                  | Signing mode future   | Seed for testnet signing   |

## Control Protocol

Use JSON lines over stdin/stdout.

### Stdout events

Example:

```json
{"type":"ready","network":"mainnet","mode":"fixture"}
{"type":"session_proposal","id":123,"pairingTopic":"abc"}
{"type":"session_approved","topic":"def","accounts":["chia:mainnet:1234567890"]}
{"type":"request","topic":"def","method":"chip0002_connect"}
{"type":"response","topic":"def","method":"chip0002_connect","ok":true}
{"type":"shutdown_complete"}
```

### Stdin commands

Required:

```json
{"type":"pair","uri":"wc:..."}
{"type":"reset"}
{"type":"disconnect_all"}
{"type":"shutdown"}
```

Optional future commands:

```json
{"type":"set_fixture","fixture":"low-balance"}
{"type":"set_network","network":"testnet"}
```

## Required WalletConnect Behavior

The runtime must:

1. initialize a wallet-side SignClient
2. pair on demand from a `wc:` URI
3. approve the proposal with the correct `chia` namespace
4. respond to session requests
5. track active topics
6. disconnect cleanly

### Approved namespace format

Mainnet:

```text
namespace: chia
chains: ["chia:mainnet"]
accounts: ["chia:mainnet:{fingerprint}"]
```

Testnet:

```text
namespace: chia
chains: ["chia:testnet"]
accounts: ["chia:testnet:{fingerprint}"]
```

## Minimum Method Surface

Required in v1:

- `chip0002_connect`
- `chip0002_chainId`
- `chia_getAddress`
- `chip0002_getAssetBalance`
- `chia_send`
- `chia_createOffer`
- `chia_cancelOffer`

Recommended in v1:

- `chip0002_getPublicKeys`
- `chip0002_filterUnlockedCoins`
- `chip0002_getAssetCoins`
- `chia_takeOffer`

Deferred until needed:

- `chip0002_signCoinSpends`
- `chip0002_signMessage`
- `chip0002_sendTransaction`
- `chia_getNfts`
- `chia_signMessageByAddress`
- `chia_bulkMintNfts`

## Acceptance Criteria

The runtime implementation ticket should not be considered complete until it can:

1. start as a supervised process
2. emit a `ready` event
3. pair from a `wc:` URI
4. approve a session
5. answer the minimum method surface in `fixture` mode
6. reset and shut down without leaked session state
7. run repeatedly across parallel test workers without WalletConnect core collisions

## Related Documents

- [`TESTING.md`](./TESTING.md)
- [`E2E_TESTNET_LIVE_SPEC.md`](./E2E_TESTNET_LIVE_SPEC.md)
- [`E2E_MAINNET_LIVE_SPEC.md`](./E2E_MAINNET_LIVE_SPEC.md)
- [`WALLET_RUNTIME_UPSTREAM_NOTES.md`](./WALLET_RUNTIME_UPSTREAM_NOTES.md)
