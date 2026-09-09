# Pengui

**Premium Financial Intelligence** - A decentralized financial platform built on the Chia Network.

Pengui is a modern, full-featured DeFi application that enables users to trade assets, manage offers, participate in lending, and interact with the Chia blockchain through a beautiful, intuitive interface.

## 🎯 Overview

Pengui provides a comprehensive suite of financial tools for the Chia ecosystem, including:

- **Trading & Order Book** - Real-time order book with advanced filtering and price discovery
- **Offer Management** - Create, view, and manage Chia offers with persistent storage
- **Lending Platform** - Create and participate in decentralized loans
- **Wallet Integration** - Seamless WalletConnect integration with Sage wallet
- **Transaction Management** - Send transactions and track history
- **Asset Management** - Support for XCH, CAT tokens, NFTs, and Options

## ✨ Features

### 🏦 Dashboard

- Real-time wallet balance overview
- Transaction history and analytics
- Quick access to all platform features
- Portfolio tracking

### 📊 Trading

- **Order Book** - View buy/sell orders with real-time updates
- **Price Discovery** - Advanced filtering b y asset pairs
- **Market & Limit Orders** - Create and execute trades
- **Order History** - Track your trading activity
- **Price Charts** - Visualize market trends (coming soon)

### 💰 Offers

- Create custom offers with multiple assets
- View and manage your active offers
- Take offers from other users
- Persistent offer storage with IndexedDB
- Offer inspection and validation

### 🏠 Loans

- Create lending opportunities
- Browse available loans
- Track loan income and analytics
- Manage your loan portfolio

### 💳 Wallet

- WalletConnect integration (Sage wallet)
- Real-time balance updates
- Send transactions
- Transaction history
- Address management

### 🐷 Piggy Bank

- Savings and accumulation features
- Asset management tools

### 📈 Option Contracts

- Create and manage option contracts
- Options trading interface

## 🛠️ Tech Stack

### Core Framework

- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type-safe development

### State Management

- **TanStack Query (React Query)** - Server state management and caching
- **Redux + Redux Persist** - Client state management
- **React Context** - Component-level state

### Styling

- **Tailwind CSS** - Utility-first CSS framework
- **next-themes** - Dark/light mode support
- **Lucide React** - Icon library

### Blockchain Integration

- **@maximedogawa/chia-wallet-connect-react** - WalletConnect for Chia
- **WalletConnect Sign Client** - Wallet connection protocol
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
bun run build:all    # WASM, then relay, then Next.js
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
│   │   ├── auth/              # Authentication features
│   │   │   └── login/         # Login functionality
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
│       │   ├── formatting/    # Date, currency, number formatting
│       │   ├── web3/          # Web3/wallet utilities
│       │   ├── validation/   # Validation schemas
│       │   ├── utils/         # Generic utilities
│       │   ├── walletConnect/ # WalletConnect integration
│       │   ├── database/      # IndexedDB setup
│       │   └── config/        # Configuration
│       └── providers/         # React context providers
│
├── public/                     # Static assets
│   ├── icons/                 # App icons
│   └── assets/                # Images & assets
│
├── .storybook/                 # Storybook configuration
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

Pengui includes a comprehensive, custom-built component library with Storybook documentation.

### View Components in Storybook

```bash
bun run storybook
```

Then open [http://localhost:6006](http://localhost:6006) to browse all components interactively.

See the [UI Component Documentation](./src/shared/ui/README.md) and [Component Catalog](./src/shared/ui/COMPONENT_CATALOG.md) for details.

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

Pengui uses WalletConnect to connect with Chia wallets (primarily Sage wallet).

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
bun dev              # Start development server
bun storybook        # Start Storybook component library

# Building
bun build            # Build for production
bun run build:wasm   # Build Splash WASM (public/wasm/) — requires Rust
bun run build:relay  # Build the splash-relay binary — requires Rust
bun run build:all    # Build WASM, relay, then Next.js
bun build-storybook  # Build Storybook for production
bun start            # Start production server

# Code Quality
bun lint             # Run ESLint
bun type-check       # Run TypeScript type checking
```

### Code Style

- **ESLint** - Follows Next.js and React best practices
- **Prettier** - Automatic code formatting
- **TypeScript** - Strict type checking enabled

### Git Hooks

Pre-commit hooks are configured via Husky and lint-staged to ensure code quality:

- **Lint & Type Check**: ESLint and TypeScript checks on staged files (with auto-fix)
- **Build**: Ensures the project builds successfully
- **Test**: Runs the test suite

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

- [Architecture Documentation](https://github.com/maximedogawa/pengui-wiki/blob/main/architecture/fsd-structure.md) - Feature-Sliced Design structure and guidelines
- [UI Component Library](./src/shared/ui/README.md) - Detailed component documentation
- [Component Catalog](./src/shared/ui/COMPONENT_CATALOG.md) - Quick component reference
- [WalletConnect Integration](./src/shared/lib/walletConnect/README.md) - Wallet integration details
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
