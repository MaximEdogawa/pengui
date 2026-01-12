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

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd penguin-pool/pengui
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

### Running Production Build

```bash
bun start
# or
npm start
```

## 📁 Project Structure

```text
pengui/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── dashboard/         # Dashboard page
│   │   ├── trading/           # Trading interface
│   │   ├── offers/            # Offers management
│   │   ├── loans/             # Lending platform
│   │   ├── wallet/            # Wallet management
│   │   ├── piggy-bank/        # Savings features
│   │   ├── option-contracts/  # Options trading
│   │   ├── profile/           # User profile
│   │   ├── login/             # Authentication
│   │   └── layout.tsx         # Root layout
│   │
│   ├── features/              # Feature modules
│   │   ├── trading/           # Trading feature
│   │   │   ├── model/         # Business logic & hooks
│   │   │   ├── ui/            # UI components
│   │   │   └── lib/           # Utilities
│   │   ├── offers/            # Offers feature
│   │   ├── loans/             # Loans feature
│   │   └── wallet/            # Wallet feature
│   │
│   ├── shared/                # Shared code
│   │   ├── ui/                # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── AssetSelector/
│   │   │   └── ...
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # Utilities & services
│   │   │   ├── walletConnect/ # WalletConnect integration
│   │   │   ├── database/      # IndexedDB setup
│   │   │   ├── utils/         # Helper functions
│   │   │   └── config/        # Configuration
│   │   └── providers/         # React context providers
│   │
│   └── entities/              # Domain entities
│       ├── asset/             # Asset types
│       ├── offer/             # Offer types
│       └── loan/              # Loan types
│
├── public/                     # Static assets
│   ├── icons/                 # App icons
│   └── assets/                # Images & assets
│
├── .husky/                     # Git hooks
├── .vscode/                    # VS Code settings
├── eslint.config.mjs          # ESLint configuration
├── tailwind.config.ts          # Tailwind configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies & scripts
```

## 🎨 UI Components

Pengui includes a comprehensive, custom-built component library. See the [UI Component Documentation](./src/shared/ui/README.md) for details.

### Quick Component Examples

```tsx
// Button
import { Button } from '@/shared/ui'
;<Button variant="primary" onClick={handleClick}>
  Click Me
</Button>

// Modal
import { Modal } from '@/shared/ui'
;<Modal onClose={handleClose}>Content</Modal>

// Asset Selector
import { AssetSelector } from '@/shared/ui'
;<AssetSelector assets={assets} onAssetsChange={handleChange} />
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

# Building
bun build            # Build for production
bun start            # Start production server

# Code Quality
bun lint             # Run ESLint
```

### Code Style

- **ESLint** - Follows Next.js and React best practices
- **Prettier** - Automatic code formatting
- **TypeScript** - Strict type checking enabled

### Git Hooks

Pre-commit hooks are configured via Husky to ensure code quality:

- ESLint checks
- Prettier formatting
- Type checking (if configured)

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

- [UI Component Library](./src/shared/ui/README.md)
- [WalletConnect Integration](./src/shared/lib/walletConnect/README.md)
- [Component Catalog](./src/shared/ui/COMPONENT_CATALOG.md)
- [Quick Start Guide](./src/shared/ui/QUICK_START.md)

## 🐛 Troubleshooting

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
