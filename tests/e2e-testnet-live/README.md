# e2e-testnet-live

The app against a **real, funded testnet11 wallet**. This is the live layer
[`../E2E_TESTNET_LIVE_SPEC.md`](../E2E_TESTNET_LIVE_SPEC.md) describes; everything under
`../e2e` stays fixture-backed and deterministic.

It proves what the mocked tiers cannot:

- the WalletConnect session carries a real key (fingerprint and address derived from the mnemonic)
- the balance and coins the UI shows come from the chain (a testnet11 full node)
- a transfer submitted in the UI is signed by that key, accepted by the node's mempool and
  confirmed in a block

## How it works

```text
Playwright (Node)                           Chromium
├── TestnetLiveWallet  ── WalletConnect relay ──  Pengui (bun run dev / start)
│     ├── keys.ts        mnemonic → m/12381/8444/2/0 → synthetic key, puzzle hash, txch address
│     ├── testnetNode.ts coin records, mempool lookup, push_tx (testnet11.api.coinset.org)
│     └── chia_send      standard spend (createCoin + change + reserveFee), BLS-signed, broadcast
└── live-wallet.spec.ts  connect → balance → 0.001 TXCH self-transfer → confirmation
```

`TestnetLiveWallet` extends the fixture-backed `SageMockWallet` (`../e2e/wallet-mock`) and
answers every RPC from real data. `chia_createOffer` / `chia_cancelOffer` go through the app's
own client-side offer builder (`src/shared/lib/wallet/offers`) with the same signer; the suite
does not exercise them through the UI yet.

## Running locally

`.env.local` needs the WalletConnect project id and the wallet:

```bash
TESTNET_WALLET_MNEMONIC="… 24 words …"
TESTNET_WALLET_FINGERPRINT=217014652
TESTNET_WALLET_ADDRESS=txch1…
TESTNET_EXPECTED_NETWORK=testnet
```

```bash
bun run test:e2e:testnet-live          # starts (or reuses) bun run dev on :3000
CI=1 bun run test:e2e:testnet-live     # production server: bun run build first
```

Without `TESTNET_WALLET_MNEMONIC` or the project id the suite skips itself with an explicit
reason. A wallet below `TESTNET_MIN_BALANCE_MOJOS` (default 0.01 TXCH) fails the run
immediately with the faucet URL. Top up at https://testnet11-faucet.chia.net/.

## Guard rails

| Variable | Default | Purpose |
| --- | --- | --- |
| `TESTNET_EXPECTED_NETWORK` | `testnet` | Anything else refuses to start; the peer never approves `chia:mainnet` |
| `TESTNET_MIN_BALANCE_MOJOS` | `10000000000` (0.01 TXCH) | Fail fast when the wallet is drained |
| `TESTNET_MAX_TRANSFER_MOJOS` | `10000000000` (0.01 TXCH) | Cap per `chia_send` / offered amount |
| `TESTNET_NODE_RPC_URL` | `https://testnet11.api.coinset.org` | Full-node RPC (Chia RPC JSON over HTTPS) |

Every broadcast is logged as JSON (`method`, `transactionId`, `spentCoinIds`, amount, fee,
address, timestamp) and printed again at worker teardown, so a failed run leaves the ids needed
to look the transaction up.

## CI

`.github/workflows/testnet-live.yml` runs the suite on `workflow_dispatch` and every Monday
06:17 UTC, in the `e2e-testnet-live` concurrency group (never two runs against the wallet at
once). It is not part of `bun run test:e2e`, `test:all` or the pull-request job.

## Known limits

- One address only (derivation index 0); change returns there, so the balance stays in one
  puzzle hash.
- No CATs: the wallet holds TXCH only, so offers can only offer XCH and cancelling is only
  possible for offers the same peer created in the same run.
- Confirmation waits on real block times (about 18 s per block on testnet11, sometimes several
  blocks); the transfer test allows six minutes.
- The public node is a third party; if it is unreachable the suite fails, not skips. It is also
  a load-balanced cluster: `get_mempool_item_by_tx_id` right after a successful `push_tx` has
  answered "not in mempool" on every run so far, so the suite only logs that and treats the
  spent-coin check (confirmation) as binding.
- Observed runs (2026-09-11, dev server, real relay): 3/3 passed in 1.9 min; transfers
  confirmed in blocks 4676507, 4676526 and 4676535.
