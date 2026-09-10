# API & Endpoint Reference

This document catalogs every external API, internal route, and WebSocket endpoint that pengui
communicates with. It is the authoritative reference for deciding what to mock in E2E tests and
for diagnosing network issues.

---

## 1. WalletConnect (CHIP-0002)

### Relay

| Setting        | Value                                                      |
| -------------- | ---------------------------------------------------------- |
| Default relay  | `wss://relay.walletconnect.com`                            |
| Env override   | `NEXT_PUBLIC_WALLET_CONNECT_RELAY_URL`                     |
| Project ID env | `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` or `WC_PROJECT_ID` |

The dApp uses `@walletconnect/sign-client` / `@walletconnect/modal`. It connects to a Sage
wallet by displaying a QR code containing a `wc:` pairing URI.

### Sage RPC Methods (all 17)

These are requested over the WalletConnect session using the `chia` namespace.

| Method                         | Direction     | Description                     |
| ------------------------------ | ------------- | ------------------------------- |
| `chip0002_connect`             | dApp → Wallet | Retrieve fingerprint + address  |
| `chip0002_chainId`             | dApp → Wallet | Get active chain ID             |
| `chip0002_getPublicKeys`       | dApp → Wallet | Fetch public key list           |
| `chip0002_filterUnlockedCoins` | dApp → Wallet | Filter spendable coins          |
| `chip0002_getAssetCoins`       | dApp → Wallet | Get coins for a specific asset  |
| `chip0002_getAssetBalance`     | dApp → Wallet | Get confirmed/spendable balance |
| `chip0002_signCoinSpends`      | dApp → Wallet | Sign a set of coin spends       |
| `chip0002_signMessage`         | dApp → Wallet | Sign an arbitrary message       |
| `chip0002_sendTransaction`     | dApp → Wallet | Broadcast a signed spend bundle |
| `chia_createOffer`             | dApp → Wallet | Create and sign an offer file   |
| `chia_takeOffer`               | dApp → Wallet | Accept an offer file            |
| `chia_cancelOffer`             | dApp → Wallet | Cancel an active offer          |
| `chia_getNfts`                 | dApp → Wallet | List NFTs in wallet             |
| `chia_send`                    | dApp → Wallet | Simple send transaction         |
| `chia_getAddress`              | dApp → Wallet | Get wallet receive address      |
| `chia_signMessageByAddress`    | dApp → Wallet | Sign a message by address       |
| `chia_bulkMintNfts`            | dApp → Wallet | Bulk mint NFT batch             |

#### Session namespace format

```
namespace: "chia"
chains:    ["chia:mainnet"]  or  ["chia:testnet"]
accounts:  ["chia:mainnet:{fingerprint}"]
```

---

## 2. SpaceScan

Explorer and token metadata for mainnet and testnet11.

| Endpoint                                       | Method | Description               |
| ---------------------------------------------- | ------ | ------------------------- |
| `{base}/address/xch-balance/{address}`         | GET    | XCH balance               |
| `{base}/api/token/{network}/balance/{address}` | GET    | CAT token list for wallet |
| `{base}/xch/richlist`                          | GET    | Rich list (unused in app) |

**Base URLs:**

| Network   | URL                                  | Env override                            |
| --------- | ------------------------------------ | --------------------------------------- |
| Mainnet   | `https://api.spacescan.io`           | `NEXT_PUBLIC_SPACESCAN_API_URL`         |
| Testnet11 | `https://api-testnet11.spacescan.io` | `NEXT_PUBLIC_SPACESCAN_TESTNET_API_URL` |

> **Note:** The app previously used `api-testnet.spacescan.io` which returned 404.
> Fixed in `src/shared/lib/utils/networkUtils.ts` to use `api-testnet11.spacescan.io`.

**Sample balance response:**

```json
{
  "status": "success",
  "xch": 5.0,
  "mojo": 5000000000000
}
```

---

## 3. Dexie

Decentralised exchange protocol for Chia offers. The app supports both mainnet and testnet.

| Endpoint          | Method | Description                |
| ----------------- | ------ | -------------------------- |
| `/v1/offers`      | GET    | List offers (with filters) |
| `/v1/offers/{id}` | GET    | Single offer details       |
| `/v1/offers`      | POST   | Upload an offer            |
| `/v1/pairs`       | GET    | List trading pairs         |
| `/v1/tickers`     | GET    | Pair price tickers         |
| `/v1/trades`      | GET    | Recent trades              |

**Base URLs:**

| Network | URL                               | Env override                        |
| ------- | --------------------------------- | ----------------------------------- |
| Mainnet | `https://api.dexie.space`         | `NEXT_PUBLIC_DEXIE_MAINNET_API_URL` |
| Testnet | `https://api-testnet.dexie.space` | `NEXT_PUBLIC_DEXIE_TESTNET_API_URL` |

---

## 4. Dexie Splash Relay (WebSocket)

Real-time offer streaming via libp2p Splash protocol. Used by the "Stream" terminal tab.

| Purpose          | URL                                     | Env                                             |
| ---------------- | --------------------------------------- | ----------------------------------------------- |
| Mainnet relay    | `wss://relay.pengui.space`         | `NEXT_PUBLIC_DEXIE_SPLASH_RELAY_MAINNET_WS_URL` |
| Testnet relay    | `wss://relay-testnet.pengui.space` | `NEXT_PUBLIC_DEXIE_SPLASH_RELAY_TESTNET_WS_URL` |
| Generic override | (mainnet or testnet)                    | `NEXT_PUBLIC_DEXIE_SPLASH_RELAY_WS_URL`         |

Self-hosted relay: see `deployment/splash-relay/Dockerfile`. Deployed as two ONCE apps
(`relay.pengui.space`, `relay-testnet.pengui.space`) — see `deployment/README.md`.

---

## 5. TibetSwap v2

AMM (Automated Market Maker) swap protocol on Chia. All calls are made directly from the
browser (NEXT*PUBLIC* vars) to the Tibet API.

| Endpoint                                        | Method | Description              |
| ----------------------------------------------- | ------ | ------------------------ |
| `/tokens`                                       | GET    | List of swappable tokens |
| `/pairs`                                        | GET    | List of LP pairs         |
| `/pair/{launcherId}`                            | GET    | Single pair details      |
| `/quote/{pairId}?amount_in=N&xch_is_input=true` | GET    | Price quote              |
| `/offer/{pairId}`                               | POST   | Submit swap offer        |

**Base URLs:**

| Network | URL                           | Env override                        |
| ------- | ----------------------------- | ----------------------------------- |
| Mainnet | `https://api.v2.tibetswap.io` | `NEXT_PUBLIC_TIBET_MAINNET_API_URL` |
| Testnet | `https://api.v2.tibetswap.io` | `NEXT_PUBLIC_TIBET_TESTNET_API_URL` |
| Default | `https://api.v2.tibetswap.io` | `NEXT_PUBLIC_TIBET_API_URL`         |

> As of 2025, Tibet v2 serves both mainnet and testnet from the same endpoint.

---

## 6. Internal Next.js API Routes

These are server-side routes in `src/app/api/`. The browser calls these to avoid CORS
issues with external APIs or to process WASM files.

| Route                   | Method | Purpose                                                                                   |
| ----------------------- | ------ | ----------------------------------------------------------------------------------------- |
| `/api/health`           | GET    | Health check — returns `{ status: "ok" }`                                                 |
| `/api/spacescan/tokens` | GET    | Proxy to SpaceScan CAT token list. **Hardcoded to mainnet.** Params: `network`, `address` |
| `/api/spacescan/icon`   | GET    | Proxy to SpaceScan asset icon images. Params: `assetId`                                   |
| `/api/wasm/[file]`      | GET    | Serve Chia CLVM/BLS WASM files with correct MIME type                                     |

> **Known issue:** `/api/spacescan/tokens` currently ignores the `network` param and always
> hits the mainnet SpaceScan endpoint. Testnet wallets show mainnet CAT metadata (acceptable
> for icons/names but asset IDs may differ).

---

## 7. Environment Variables

### Application (NEXT*PUBLIC*\*)

| Variable                                        | Required | Default                                 | Description                                           |
| ----------------------------------------------- | -------- | --------------------------------------- | ----------------------------------------------------- |
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`         | Yes      | —                                       | WalletConnect Cloud project ID                        |
| `NEXT_PUBLIC_WALLET_CONNECT_RELAY_URL`          | No       | `wss://relay.walletconnect.com`         | WC relay URL                                          |
| `NEXT_PUBLIC_WALLET_CONNECT_CHAIN_ID`           | No       | `chia:mainnet`                          | Default chain                                         |
| `NEXT_PUBLIC_SPACESCAN_API_URL`                 | No       | `https://api.spacescan.io`              | SpaceScan mainnet                                     |
| `NEXT_PUBLIC_SPACESCAN_TESTNET_API_URL`         | No       | `https://api-testnet11.spacescan.io`    | SpaceScan testnet11                                   |
| `NEXT_PUBLIC_DEXIE_MAINNET_API_URL`             | No       | `https://api.dexie.space`               | Dexie mainnet                                         |
| `NEXT_PUBLIC_DEXIE_TESTNET_API_URL`             | No       | `https://api-testnet.dexie.space`       | Dexie testnet                                         |
| `NEXT_PUBLIC_TIBET_API_URL`                     | No       | `https://api.v2.tibetswap.io`           | Tibet default                                         |
| `NEXT_PUBLIC_TIBET_MAINNET_API_URL`             | No       | `https://api.v2.tibetswap.io`           | Tibet mainnet                                         |
| `NEXT_PUBLIC_TIBET_TESTNET_API_URL`             | No       | `https://api.v2.tibetswap.io`           | Tibet testnet                                         |
| `NEXT_PUBLIC_DEXIE_SPLASH_RELAY_WS_URL`         | No       | `ws://localhost:9090`                   | Splash relay (generic)                                |
| `NEXT_PUBLIC_DEXIE_SPLASH_RELAY_MAINNET_WS_URL` | No       | `wss://relay.pengui.space`         | Splash mainnet                                        |
| `NEXT_PUBLIC_DEXIE_SPLASH_RELAY_TESTNET_WS_URL` | No       | `wss://relay-testnet.pengui.space` | Splash testnet                                        |
| `NEXT_PUBLIC_APP_ENV`                           | No       | `production`                            | Info banner mode (`demo`/`alpha`/`beta`/`production`) |

### Test-only

| Variable                     | Required            | Description                                    |
| ---------------------------- | ------------------- | ---------------------------------------------- |
| `WC_PROJECT_ID`              | Alt to NEXT*PUBLIC* | WalletConnect project ID for Playwright        |
| `WC_CHAIN_ID`                | No                  | Override chain for SageMockWallet              |
| `TESTNET_FUNDING_TIMEOUT_MS` | No                  | Poll timeout ms (default `600_000`)            |
| `TESTNET_SPACESCAN_API_URL`  | No                  | Override SpaceScan base for testnet balance    |

### Deployment (server-side only, see deployment/README.md)

| Variable                  | Description                             |
| ------------------------- | ---------------------------------------- |
| `RELAY_MAINNET_SUBDOMAIN` | ONCE hostname for mainnet Splash relay   |
| `RELAY_TESTNET_SUBDOMAIN` | ONCE hostname for testnet Splash relay   |
| `RELAY_IMAGE`             | Docker image for Splash relay ONCE apps  |
| `DOMAIN`                  | Root domain for the app's ONCE hostname  |

---

## 8. What is Mocked in Each Test File

| Test file                             | Mocked APIs                                                     |
| ------------------------------------- | --------------------------------------------------------------- |
| `smoke/*.spec.ts`                     | None — hits real dev server                                     |
| `regression/wallet-connected.spec.ts` | None (WalletConnect relay is real)                              |
| `regression/wallet-assets.spec.ts`    | `/api/spacescan/tokens` → empty list                            |
| `regression/offers-flow.spec.ts`      | None                                                            |
| `regression/trading-flow.spec.ts`     | `api.dexie.space`                                                |
| `acceptance/*.spec.ts`                | None                                                            |
