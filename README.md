# Pengui

**Premium Financial Intelligence** - A decentralized financial platform built on the Chia Network.

Pengui is a DeFi application for the Chia ecosystem: trade against a live order book, create and take Chia offers, and manage your wallet — in an ordinary browser, or **installed directly inside the Sage wallet** with no WalletConnect pairing.

**Current version: 0.0.8**

## 🎯 Overview

- **Trading & Order Book** - Real-time order book with filtering and price discovery; market and limit orders
- **Offer Management** - Create, browse, take and cancel Chia offers, with persistent local storage
- **Live Offer Stream** - Offers streamed over the Splash libp2p relay
- **Wallet** - Balances, asset detail, send and transaction history for XCH and CAT assets
- **Two wallet transports, one codebase** - Sage via WalletConnect in a browser, or the Sage in-app bridge when installed as a Sage app
- **Lending & Option Contracts** - UI preview; the on-chain flows are the next milestone

### What runs where

| Target         | Build                | Wallet transport   | Login            |
| -------------- | -------------------- | ------------------ | ---------------- |
| Hosted web app | `bun run build`      | WalletConnect      | QR / pairing URI |
| Sage app       | `bun run build:sage` | Sage in-app bridge | One tap, no QR   |

Both are served from the same origin, so `https://pengui.space` is both the web app and the Sage _Install from URL_ target.

### Status in 0.0.8

- ✅ **Sage in-app integration** — runtime detection, bridge adapter, login without QR, balances, send, signing, theme and lifecycle
- ✅ **Client-side offer construction** — the Sage bridge has no offer RPCs, so create/take/cancel offers are built in the browser with `chia-wallet-sdk-wasm` and signed through the bridge. XCH and CAT only; NFT, DID and option-contract offers are disabled with an explanation
- ✅ **Static snapshot packaging** — `sage-manifest.json`, CSP-safe export, network whitelist
- ⚠️ **Loans and Option Contracts are a UI mockup.** Milestone m-1 (_Loans as Offers_) makes them live
- ⚠️ **Swap is off by default.** TibetSwap, the AMM behind it, is winding down; opt in with `NEXT_PUBLIC_FEATURE_FLAGS=...,swap`
- ⏳ **In-Sage verification on desktop and mobile is not yet recorded** — see the checklist in the wiki

## ✨ Features

### 🏦 Dashboard

- Real-time wallet balance overview
- Transaction history and analytics
- Quick access to all platform features
- Portfolio tracking

### 📊 Trading

- **Order Book** - View buy/sell orders with real-time updates
- **Price Discovery** - Advanced filtering by asset pairs
- **Market & Limit Orders** - Create and execute trades
- **Order History** - Track your trading activity
- **Price Charts** - Visualize market trends (coming soon)

### 💰 Offers

- Create custom offers with multiple assets
- View and manage your active offers
- Take offers from other users
- Persistent offer storage with IndexedDB
- Offer inspection and validation

### 🏠 Loans — _UI preview_

- Create lending opportunities
- Browse available loans
- Track loan income and analytics
- Manage your loan portfolio

> The `/loans` route is a mockup today. Milestone **m-1 (Loans as Offers)** turns it into
> peer-to-peer loans built on Chia option contracts and traded as standard offers.

### 💳 Wallet

- **Two transports behind one interface** — WalletConnect in a browser, the Sage in-app
  bridge when running inside Sage. Feature code never knows which is active.
- Real-time balance updates (XCH and CAT)
- Send transactions, with the host wallet's own approval dialog inside Sage
- Transaction history
- Address management

### 🐷 Piggy Bank

- Savings and accumulation features
- Asset management tools

### 📈 Option Contracts — _UI preview_

- Create and manage option contracts
- Options trading interface

> Option-contract **offers** are not yet supported by the client-side offer driver; they
> are disabled in the UI with an explanation. Milestone **m-1** implements them.

## 🛠️ Tech Stack

### Core Framework

- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type-safe development

### State Management

- **TanStack Query (React Query)** - Server and chain data
- **Redux + Redux Persist** - WalletConnect sessions only (an implementation detail of that
  transport; nothing outside the WalletConnect adapter imports it)
- **Zustand** - Local UI state (sidebar, order book filters)
- **Dexie / IndexedDB** - Offer persistence across reloads
- **React Context** - The active wallet provider, network and theme

### Styling

- **Tailwind CSS** - Utility-first CSS framework
- **next-themes** - Dark/light mode support
- **Lucide React** - Icon library

### Blockchain Integration

- **@maximedogawa/chia-wallet-connect-react** - WalletConnect for Chia
- **WalletConnect Sign Client** - Wallet connection protocol
- **sage-app-sdk** - Sage in-app bridge (no WalletConnect when running inside Sage)
- **chia-wallet-sdk-wasm** - Client-side offer construction for the Sage build
- **Dexie** - IndexedDB wrapper for local storage

### Development Tools

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript** - Static type checking

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20.19.0+ or 22.12.0+
- **Bun** (recommended) or npm/yarn/pnpm
- **Sage Wallet** or compatible WalletConnect wallet
- **Rust** (optional, for the Splash Stream tab and the relay): install from [rustup.rs](https://rustup.rs). wasm-pack ships as a devDependency, so `bun install` is enough — no global install needed.

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd pengui
   ```

2. **Install dependencies**

   ```bash
   bun install
   # or
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   # Copy example env file (if available)
   cp .env.example .env.local
   ```

   Configure your environment variables:
   - WalletConnect project ID
   - API endpoints
   - Other service configurations

4. **Run the development server**

   ```bash
   bun dev
   # or
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Building for Production

```bash
bun build
# or
npm run build
```

The production build will be in the `.next` directory.

To include the **Splash Stream** terminal (libp2p WASM), build the WASM first, or run a full build:

```bash
bun run build:wasm   # Build splash-wasm → public/wasm/ (requires Rust)
bun run build:relay  # Build the splash-relay binary (requires Rust)
bun run build:all    # WASM, relay, Next.js, Chia wasm, then the Sage snapshot
```

`build:wasm` adds the `wasm32-unknown-unknown` Rust target if it is missing and uses the
wasm-pack that `bun install` provides, so the only prerequisite is a Rust toolchain.

### Running Production Build

```bash
bun start
# or
npm start
```

## 📁 Project Structure

This project follows **Feature-Sliced Design (FSD)** methodology for scalable and maintainable code organization.

```text
pengui/
├── src/
│   ├── app/                    # Next.js App Router (Application Layer)
│   │   ├── dashboard/         # Dashboard page
│   │   ├── trading/           # Trading interface
│   │   ├── offers/            # Offers management
│   │   ├── loans/             # Lending platform
│   │   ├── wallet/            # Wallet management
│   │   ├── piggy-bank/        # Savings features
│   │   ├── option-contracts/  # Options trading
│   │   ├── profile/           # User profile
│   │   ├── login/             # Authentication page
│   │   ├── layout.tsx         # Root layout
│   │   └── globals.css        # Global styles
│   │
│   ├── widgets/                # Widgets Layer (Large composite UI blocks)
│   │   ├── dashboard-layout/  # Main dashboard layout with sidebar
│   │   │   ├── ui/            # Layout components
│   │   │   └── model/         # Layout hooks & logic
│   │   └── trading-layout/    # Trading interface layout
│   │       └── ui/            # Trading layout components
│   │
│   ├── features/               # Features Layer (User interactions)
│   │   ├── auth/              # Login screen (WalletConnect and Sage modes)
│   │   ├── trading/           # Trading feature
│   │   │   ├── model/         # Business logic & hooks
│   │   │   ├── ui/            # UI components
│   │   │   ├── api/           # API calls
│   │   │   └── lib/           # Trading utilities
│   │   ├── offers/            # Offers feature
│   │   ├── loans/             # Loans feature
│   │   └── wallet/            # Wallet feature
│   │
│   ├── entities/               # Entities Layer (Business domain entities)
│   │   ├── asset/             # Asset types & definitions
│   │   ├── offer/             # Offer types & structures
│   │   ├── loan/              # Loan types & structures
│   │   └── transaction/       # Transaction types & utilities
│   │
│   └── shared/                 # Shared Layer (Reusable infrastructure)
│       ├── ui/                # Design system components
│       │   ├── button/        # Button component
│       │   ├── modal/         # Modal component
│       │   ├── asset-selector/# Asset selector & sub-components
│       │   └── ...            # Other UI components
│       ├── hooks/             # Shared React hooks
│       ├── lib/               # Utilities organized by domain
│       │   ├── wallet/        # Provider-agnostic wallet layer (WalletConnect + Sage adapters)
│       │   ├── walletConnect/ # WalletConnect RPC layer
│       │   ├── database/      # IndexedDB setup
│       │   ├── config/        # Configuration
│       │   └── ...            # Formatting, validation, generic utilities
│       └── providers/         # React context providers
│
├── tests/                      # Playwright E2E, component and Sage snapshot tests
├── scripts/                    # Build helpers (WASM, Sage snapshot, dependency check)
│
├── public/                     # Static assets
│   ├── icons/                 # App icons
│   └── assets/                # Images & assets
│
├── .husky/                     # Git hooks
├── eslint.config.mjs          # ESLint configuration
├── tailwind.config.ts          # Tailwind configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies & scripts
```

### Architecture Principles

- **Layer Separation**: Clear boundaries between app, widgets, features, entities, and shared
- **Colocation**: Related files (component, styles, tests, types) stay together
- **Public API**: Barrel exports (`index.ts`) control module boundaries
- **Vertical Slicing**: Organized by feature/domain, not by technical role

See [Architecture Documentation](https://github.com/maximedogawa/pengui-wiki/blob/main/architecture/fsd-structure.md) for detailed guidelines.

## 🎨 UI Components

Pengui includes a custom-built component library in `src/shared/ui` (primitives, forms, layout,
branding and icons); its `index.ts` is the public API. There is no Storybook; Playwright component
tests under `tests/ct` render the primitives in a real browser (`bun run test:ct`).

### Quick Component Examples

```tsx
// Button
import { Button } from "@/shared/ui";
<Button variant="primary" onClick={handleClick}>
  Click Me
</Button>;

// Modal
import { Modal } from "@/shared/ui";
<Modal onClose={handleClose}>Content</Modal>;

// Asset Selector
import { AssetSelector } from "@/shared/ui";
<AssetSelector assets={assets} onAssetsChange={handleChange} />;
```

## 🔌 Wallet Integration

In a browser Pengui uses WalletConnect to connect with Chia wallets (primarily Sage wallet).
Inside the Sage wallet it runs as a Sage app and talks to the wallet through `sage-app-sdk`
instead; `bun run build:sage` produces that static snapshot. See
[Sage in-app integration](https://github.com/maximedogawa/pengui-wiki/blob/main/architecture/sage-in-app-integration.md)
in the wiki.

### Connecting a Wallet

1. Navigate to the login page
2. Click "Connect Wallet"
3. Select your wallet (Sage, Goby, etc.)
4. Approve the connection in your wallet

### Available Wallet Operations

- View balance
- Send transactions
- Create offers
- Sign messages
- Manage assets

See [WalletConnect Documentation](./src/shared/lib/walletConnect/README.md) for implementation details.

## 📦 Key Dependencies

- **next** - React framework
- **react** & **react-dom** - UI library
- **@tanstack/react-query** - Data fetching & caching
- **@maximedogawa/chia-wallet-connect-react** - Chia wallet integration
- **dexie** - IndexedDB wrapper
- **lucide-react** - Icons
- **next-themes** - Theme management
- **tailwindcss** - Styling

## 🧪 Development

### Available Scripts

```bash
# Development
bun run dev              # Start development server
bun run start            # Start production server

# Building
bun run build            # Build for production (.next)
bun run build:wasm       # Build Splash WASM (public/wasm/) — requires Rust
bun run build:relay      # Build the splash-relay binary — requires Rust
bun run build:sage       # Build the static Sage app snapshot (out/)
bun run build:all        # WASM, relay, Next.js, Chia wasm, Sage snapshot

# Code quality
bun run lint             # ESLint
bun run type-check       # tsc --noEmit
bun run format           # Prettier (write) / format:check
bun run check:deps       # Every imported package is declared in package.json

# Tests (see the wiki testing guide and tests/TESTING.md)
bun run test:unit        # Bun unit tests
bun run test:integration # Bun integration tests
bun run test:e2e         # Playwright E2E (smoke, regression, acceptance)
bun run test:ct          # Playwright component tests
bun run test:sage        # Sage snapshot CSP/hydration checks
bun run test:all         # unit, integration, e2e, ct
```

### Code Style

- **ESLint** - Follows Next.js and React best practices
- **Prettier** - Automatic code formatting
- **TypeScript** - Strict type checking enabled

### Git Hooks

`bun install` registers the Husky pre-commit hook through the `prepare` script. On every commit,
`.husky/pre-commit` runs, in order and aborting on the first failure:

- **Build**: `bun run build`
- **Format & lint**: Prettier and ESLint on the changed `.ts/.tsx/.js/.jsx` (and `.json/.css/.md`
  for Prettier) files
- **Test**: `bun run test:unit` and `bun run test:integration`

Type checking is not part of the hook beyond what `next build` performs; run `bun run type-check`
yourself. Details: [Git hooks](https://github.com/maximedogawa/pengui-wiki/blob/main/development/git-hooks.md).

## 🔒 Security

- All wallet operations require explicit user approval
- Private keys never leave the wallet
- Secure WalletConnect protocol for wallet communication
- Client-side validation for all transactions

## 🌐 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers with WalletConnect support

## 📝 License

See [LICENSE](./LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please ensure:

- Code follows the project's style guidelines
- All tests pass
- TypeScript types are properly defined
- Components are documented

## 📚 Additional Resources

- [Architecture overview](https://github.com/maximedogawa/pengui-wiki/blob/main/architecture/overview.md) - Routes, provider tree, state, feature flags, WASM — **read this first**
- [Feature-Sliced Design structure](https://github.com/maximedogawa/pengui-wiki/blob/main/architecture/fsd-structure.md) - Layer rules and folder conventions
- [Wallet integration](https://github.com/maximedogawa/pengui-wiki/blob/main/architecture/wallet-integration.md) - The WalletProvider seam, WalletConnect and Sage
- [Sage in-app integration](https://github.com/maximedogawa/pengui-wiki/blob/main/architecture/sage-in-app-integration.md) - Running inside the Sage wallet
- [Development workflow](https://github.com/maximedogawa/pengui-wiki/blob/main/development/workflow.md) - Three repos, Backlog.md, scripts, CI, deploy
- [Testing guide](https://github.com/maximedogawa/pengui-wiki/blob/main/testing/README.md) and [tests/TESTING.md](./tests/TESTING.md) - Test layers and how to run them
- [Deployment](./deployment/README.md) - ONCE-based deployment of the app and relays
- [WalletConnect Integration](./src/shared/lib/walletConnect/README.md) - WalletConnect RPC layer details
- [Pengui Wiki](https://github.com/maximedogawa/pengui-wiki) - Architecture, development and testing documentation
- [Pengui Backlog](https://github.com/maximedogawa/pengui-backlog) - Tasks and bugs
- [Infinite Loop Guardrails](https://github.com/maximedogawa/pengui-wiki/blob/main/development/infinite-loop-guardrails.md) - Preventing infinite loops in useEffect hooks

## 🐛 Troubleshooting

### Infinite Loop / Continuous Compilation

If Turbopack shows "compiling..." indefinitely or pages won't switch:

- Check browser console for infinite loop warnings
- Review `useEffect` dependency arrays (see [Infinite Loop Guardrails](https://github.com/maximedogawa/pengui-wiki/blob/main/development/infinite-loop-guardrails.md))
- Run `bun run lint` to check for React Hooks issues
- Look for `useEffect` hooks that update state included in their dependency array

### Wallet Connection Issues

- Ensure your wallet supports WalletConnect
- Check that the WalletConnect project ID is configured
- Try disconnecting and reconnecting

### Build Errors

- Clear `.next` directory and rebuild
- Ensure all dependencies are installed
- Check Node.js version compatibility

### Database Issues

- Clear browser IndexedDB if offers aren't persisting
- Check browser console for database errors

## 📞 Support

For issues, questions, or contributions, please refer to the main project repository.

---

**Pengui** - Premium Financial Intelligence on Chia Network 🐧
