# Pengui

**Premium Financial Intelligence** — a decentralized financial platform built on the Chia Network.

Pengui is a full-featured DeFi application for trading assets, managing offers, participating in lending, and interacting with the Chia blockchain.

## Overview

- **Trading & Order Book** — real-time order book with advanced filtering and price discovery
- **Offer Management** — create, view, and manage Chia offers with persistent IndexedDB storage
- **Lending Platform** — create and participate in decentralized loans
- **Wallet Integration** — WalletConnect integration with Sage wallet
- **Transaction Management** — send transactions and track history
- **Asset Management** — XCH, CAT tokens, NFTs, and Options

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16, React 19, TypeScript |
| State | TanStack Query, Redux + Redux Persist, Zustand |
| Styling | Tailwind CSS, Radix UI, Lucide React |
| Blockchain | @maximedogawa/chia-wallet-connect-react, WalletConnect |
| Storage | Dexie (IndexedDB) |
| Testing | Playwright (E2E + component), Bun test (unit/integration) |
| Tooling | ESLint, Prettier, Husky, lint-staged |

## Getting Started

### Prerequisites

- **Node.js** 26.2.0 (see `.nvmrc`) — use `nvm use` or install via [nvm](https://github.com/nvm-sh/nvm)
- **Bun** — install from [bun.sh](https://bun.sh)
- **Sage Wallet** or compatible WalletConnect wallet
- **Rust + wasm-pack** (optional, for the Splash Stream tab / `build:all`) — see below for per-distro instructions

**Rust + wasm-pack on Arch Linux:**

```bash
sudo pacman -S rust rust-wasm wasm-pack
```

> `rust-wasm` adds the `wasm32-unknown-unknown` target to the system Rust toolchain. Without it, `wasm-pack build` fails even if Rust is installed.

**Rust + wasm-pack on other Linux / macOS:**

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh  # installs rustup + rust
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
```

### Installation

1. **Clone and enter the repo**

   ```bash
   git clone <repository-url>
   cd pengui
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Install Playwright browsers** (`@playwright/test` is already in devDependencies)

   ```bash
   npx playwright install
   # Linux: also install system dependencies on first run
   sudo npx playwright install-deps
   ```

4. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Key variables to configure:

   | Variable | Required | Description |
   |---|---|---|
   | `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | Yes — for wallet features | Get a free project ID at [cloud.walletconnect.com](https://cloud.walletconnect.com) |
   | `NEXT_PUBLIC_WALLET_CONNECT_RELAY_URL` | No | WalletConnect relay, defaults to `wss://relay.walletconnect.com` |
   | `NEXT_PUBLIC_DEXIE_MAINNET_API_URL` | No | Dexie mainnet API, defaults to `https://api.dexie.app` |
   | `NEXT_PUBLIC_DEXIE_SPLASH_RELAY_WS_URL` | No | Splash libp2p relay for the Stream tab |

   > If `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` is not set, the app starts normally but wallet connection is disabled. You will see a warning in the browser console: _"WalletConnect project ID not set — wallet features disabled."_

5. **Start the development server**

   ```bash
   bun dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Building

```bash
bun build          # Next.js production build → .next/
bun start          # Serve the production build
```

**With Splash Stream (libp2p WASM) — requires Rust + wasm-pack:**

```bash
bun run build:wasm   # Compile splash-wasm → public/wasm/
bun run build:relay  # Compile splash-relay binary
bun run build:all    # build:wasm + build:relay + build
```

**Run the Splash relay locally:**

```bash
bun run relay                  # Mainnet (port 9090)
bun run relay:testnet          # Testnet (port 9091)
bun run relay:debug            # With RUST_LOG=debug
```

## Testing

The project has four test tiers:

| Command | What it runs |
|---|---|
| `bun run test:unit` | Bun unit tests in `src/` |
| `bun run test:integration` | Bun integration tests in `src/tests/integration/` |
| `bun run test:ct` | Playwright component tests in `tests/ct/` |
| `bun run test:ct:ui` | Component tests with interactive UI |
| `bun run test:e2e` | Playwright E2E tests in `tests/e2e/` |
| `bun run test:e2e:ui` | E2E tests with interactive Playwright UI |
| `bun run test:all` | All of the above |

**E2E test tiers** (in `tests/e2e/`):

- `smoke/` — fast page-load checks, run on every PR
- `regression/` — authenticated WalletConnect flows via SageMockWallet (needs `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`)
- `acceptance/` — feature behaviour, mostly unauthenticated

The E2E config auto-starts the app (`bun dev` locally, `bun start` on CI). Set `PLAYWRIGHT_TEST_BASE_URL` to point at an already-running server.

**Component tests** (`tests/ct/`) run in a Vite sandbox — no Next.js internals (`next/navigation`, `useRouter`, etc.).

## Scripts Reference

```bash
# Dev
bun dev              # Next.js dev server (Turbopack)

# Build
bun build            # Production build
bun run build:wasm   # WASM (requires Rust + wasm-pack)
bun run build:relay  # Relay binary (requires Rust)
bun run build:all    # WASM + relay + build
bun start            # Serve production build

# Test
bun run test:unit
bun run test:integration
bun run test:ct          # Playwright component tests
bun run test:ct:ui
bun run test:e2e         # Playwright E2E tests
bun run test:e2e:ui
bun run test:all

# Code quality
bun lint             # ESLint
bun run type-check   # TypeScript (tsc --noEmit)
bun run format       # Prettier (write)
bun run format:check # Prettier (check)
```

## Project Structure

This project follows **Feature-Sliced Design (FSD)**.

```text
pengui/
├── src/
│   ├── app/          # Next.js App Router (pages, layouts, global styles)
│   ├── widgets/      # Large composite UI blocks
│   ├── features/     # User-interaction features (auth, trading, offers, loans, wallet)
│   ├── entities/     # Business domain types (asset, offer, loan, transaction)
│   └── shared/       # Reusable infrastructure (ui/, hooks/, lib/, providers/)
│
├── tests/
│   ├── e2e/          # Playwright E2E tests (smoke/, regression/, acceptance/)
│   └── ct/           # Playwright component tests
│
├── crates/
│   ├── splash-wasm/  # libp2p WASM for the Stream tab
│   └── splash-relay/ # Splash relay server (Rust)
│
├── public/           # Static assets
├── playwright.config.ts
├── playwright-ct.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

**Layer rules:** each layer may only import from layers below it: `app → widgets → features → entities → shared`.

## Troubleshooting

**Infinite loop / continuous compilation**

- Check the browser console for loop warnings
- Review `useEffect` dependency arrays — hooks that update state included in their own deps cause cycles
- Run `bun lint` and look for React Hooks rule violations

**`ExperimentalWarning: localStorage is not available` during build**

This is a Node.js 22+ warning emitted during static page generation — it is harmless and does not affect the app. Node.js's experimental Web Storage API requires `--localstorage-file` to be passed to the process, which Next.js does not do. The app guards all `localStorage` access with `typeof window !== "undefined"` checks so nothing breaks at runtime.

**Wallet features disabled / "WalletConnect project ID not set" in console**

- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` is missing from `.env`, or the dev server hasn't been restarted since it was added
- Get a free project ID at [cloud.walletconnect.com](https://cloud.walletconnect.com), add it to `.env`, then **restart `bun dev`**
- Without it the app still loads but all wallet features are disabled

> **Turbopack dev mode note:** Unlike the production webpack build, Turbopack does not inline `process.env.NEXT_PUBLIC_*` inside pre-compiled `dist/` files of packages in `transpilePackages`. The WalletConnect project ID is worked around by forwarding it through `next.config.ts`'s `env` block, which Turbopack does process. If you add new `NEXT_PUBLIC_*` vars that need to be visible inside library code, add them to the `env` block in `next.config.ts` as well.

**Wallet connection issues**

- Verify `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` is set in `.env.local`
- Ensure your wallet supports WalletConnect
- Try disconnecting and reconnecting

**Build errors**

- Delete `.next/` and rebuild
- Run `bun install` to ensure all dependencies are installed
- Check the Node version matches `.nvmrc` (`node --version`)

**Playwright system dependencies (Linux)**

- Run `sudo npx playwright install-deps` to install browser system libraries
- Or install the packages manually: `sudo apt-get install libicu74 libxml2 libflite1`
- Browser binaries are cached in `~/.cache/ms-playwright/`

**Database (IndexedDB) issues**

- Clear the browser's IndexedDB if offers are not persisting
- Check the browser console for Dexie errors

---

**Pengui** — Premium Financial Intelligence on Chia Network
