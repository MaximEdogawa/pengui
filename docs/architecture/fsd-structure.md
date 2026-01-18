# Feature-Sliced Design Architecture

This document explains the Feature-Sliced Design (FSD) structure used in the Pengui codebase.

## Overview

Feature-Sliced Design is a methodology for organizing frontend code that emphasizes:
- **Vertical slicing** by business features/domains
- **Layer separation** with clear boundaries
- **Colocation** of related files
- **Public API** pattern via barrel exports

## Layer Structure

Our codebase follows FSD with the following layers (from top to bottom):

```
app → widgets → features → entities → shared
```

### Layer Responsibilities

#### `app/` - Application Layer
- **Purpose**: Next.js App Router pages and routing
- **Can import from**: All layers
- **Contains**: 
  - Route pages (`page.tsx` files)
  - Root layout (`layout.tsx`)
  - Global styles (`globals.css`)

**Note**: Due to Next.js App Router requirements, pages remain in `app/` directory rather than a separate `pages/` layer.

#### `widgets/` - Widgets Layer
- **Purpose**: Large composite UI blocks used across multiple pages
- **Can import from**: `features`, `entities`, `shared`
- **Cannot import from**: `app`, other `widgets`
- **Examples**:
  - `dashboard-layout/` - Main dashboard layout with sidebar
  - `trading-layout/` - Trading interface layout

#### `features/` - Features Layer
- **Purpose**: User interactions and business capabilities
- **Can import from**: `entities`, `shared`
- **Cannot import from**: `app`, `widgets`, other `features`
- **Structure**: Each feature has:
  - `ui/` - Feature-specific UI components
  - `model/` - Business logic, hooks, state management
  - `api/` - API calls and data fetching
  - `lib/` - Feature-specific utilities
  - `index.ts` - Public API exports
- **Examples**:
  - `auth/login/` - Login functionality
  - `wallet/` - Wallet management
  - `trading/` - Trading features
  - `offers/` - Offer management
  - `loans/` - Loan features

#### `entities/` - Entities Layer
- **Purpose**: Business domain entities with state and behavior
- **Can import from**: `shared` only
- **Cannot import from**: `app`, `widgets`, `features`, other `entities`
- **Structure**: Each entity has:
  - `ui/` - Entity-specific UI components
  - `model/` - Entity state, types, business logic
  - `api/` - Entity API calls
  - `index.ts` - Public API exports
- **Examples**:
  - `asset/` - Asset types and definitions
  - `offer/` - Offer types and structures
  - `loan/` - Loan types and structures
  - `transaction/` - Transaction types and utilities

#### `shared/` - Shared Layer
- **Purpose**: Reusable infrastructure code
- **Cannot import from**: Any other layer
- **Contains**:
  - `ui/` - Design system components (Button, Modal, etc.)
  - `lib/` - Utilities organized by domain:
    - `formatting/` - Date, currency, number formatting
    - `web3/` - Web3/wallet utilities
    - `validation/` - Validation schemas
    - `utils/` - Generic utilities
  - `hooks/` - Shared React hooks
  - `providers/` - React context providers
  - `api/` - API client configuration
  - `config/` - Configuration files

## Decision Matrix: Where Does Code Go?

### Is it a user-facing interaction/capability?
✅ → `features/[domain]/[action]/`

**Example**: Login form → `features/auth/login/`

### Is it a business entity with state and behavior?
✅ → `entities/[entity-name]/`

**Example**: Transaction types → `entities/transaction/`

### Is it a large UI composition used on multiple pages?
✅ → `widgets/[widget-name]/`

**Example**: Dashboard layout → `widgets/dashboard-layout/`

### Is it a route/page component?
✅ → `app/[route-name]/page.tsx`

**Example**: Dashboard page → `app/dashboard/page.tsx`

### Is it reusable across 3+ features/entities?
✅ → `shared/[category]/`

**Example**: Button component → `shared/ui/button/`

### Is it only used in one feature?
✅ → Keep it colocated in that feature folder

### Is it a tiny utility used once?
✅ → Colocate with the component using it

## File Organization Principles

### Colocation
Keep related files together:
- Component + styles + tests + types in the same folder
- Hooks used by a component in the same folder or nearby
- Types used by a component in the same file or nearby

### Folder Structure
Each module follows this structure:
```
[module-name]/
├── ui/           # UI components
├── model/        # Business logic, hooks, state
├── api/          # API calls (if needed)
├── lib/          # Module-specific utilities (if needed)
└── index.ts      # Public API exports
```

### Naming Conventions

- **Folders**: kebab-case (e.g., `user-profile`, `connect-wallet`)
- **Components**: PascalCase (e.g., `UserProfile.tsx`, `ConnectWalletButton.tsx`)
- **Files**: kebab-case for utilities (e.g., `format-date.ts`, `use-wallet.ts`)
- **Test files**: Match component name with `.test.tsx` extension
- **Index files**: Always lowercase `index.ts` or `index.tsx`

## Import Rules

### Path Aliases
- `@/widgets/*` → `./src/widgets/*`
- `@/features/*` → `./src/features/*`
- `@/entities/*` → `./src/entities/*`
- `@/shared/*` → `./src/shared/*`
- `@/*` → `./src/*` (backward compatibility)

### Import Examples
```typescript
// ✅ Good - Using layer aliases
import { Button } from '@/shared/ui'
import { LoginForm } from '@/features/auth/login'
import { Transaction } from '@/entities/transaction'

// ❌ Bad - Direct file imports (use barrel exports)
import Button from '@/shared/ui/button/Button'
```

### ESLint Enforcement
ESLint rules enforce layer boundaries:
- `app` can import from all layers
- `widgets` can import from `features`, `entities`, `shared`
- `features` can import from `entities`, `shared`
- `entities` can import from `shared` only
- `shared` cannot import from other layers

## Best Practices

1. **Use Barrel Exports**: Always export through `index.ts` files
2. **Keep Modules Focused**: Each feature/entity should have a single responsibility
3. **Avoid Over-fragmentation**: Don't create separate folders for every tiny utility
4. **File Count Guidelines**: Aim for <15 files per feature module
5. **Depth Limit**: Keep folder depth to 4-5 levels maximum
6. **Public API**: Only export what's needed externally via `index.ts`

## Component Collection

Shared UI components are documented in Storybook:
- Run `bun run storybook` to view component library
- Stories are colocated with components
- See `src/shared/ui/COMPONENT_CATALOG.md` for quick reference

## Migration Notes

- Old imports using `@/shared/lib/utils/*` still work via backward-compatible exports
- Gradually migrate to new domain-based paths:
  - `@/shared/lib/utils/chia-units` → `@/shared/lib/formatting/chia-units`
  - `@/shared/lib/utils/addressUtils` → `@/shared/lib/web3/address`

## References

- [Feature-Sliced Design Documentation](https://feature-sliced.design/)
- [FSD Best Practices](https://feature-sliced.design/docs/guides/best-practices)
