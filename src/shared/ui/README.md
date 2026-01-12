# Shared UI Component Library

A custom-built, self-programmed component library for the Penguin Pool application. All components are designed to be reusable, accessible, and consistent with the application's design system.

## Quick Search

Search for components by name or category:

- **Button** - Interactive button with variants
- **Modal** - Overlay dialog/modal component
- **AssetSelector** - Asset selection form component
- **Input** - Form input components (AmountInput, AssetIdInput, etc.)
- **Layout** - Layout components (DashboardLayout, WalletConnectionGuard)
- **Icons** - Custom icon components (GithubIcon, XIcon)
- **Utility** - Utility components (CopyableHexString)

## Component Categories

### Primitive Components

#### Button

A versatile button component with multiple variants, sizes, and icon support.

**Props:**

- `variant`: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info'
- `size`: 'sm' | 'md' | 'lg'
- `disabled`: boolean
- `icon`: LucideIcon (optional)
- `fullWidth`: boolean
- `onClick`: () => void
- `type`: 'button' | 'submit' | 'reset'

**Example:**

```tsx
import { Button } from '@/shared/ui'
import { Plus } from 'lucide-react'

;<Button variant="primary" size="md" icon={Plus} onClick={handleClick}>
  Create Offer
</Button>
```

#### Modal

A modal/dialog overlay component with backdrop blur and customizable width.

**Props:**

- `onClose`: () => void (required)
- `maxWidth`: string (default: 'max-w-5xl')
- `closeOnOverlayClick`: boolean (default: true)
- `className`: string

**Example:**

```tsx
import { Modal } from '@/shared/ui'

;<Modal onClose={handleClose} maxWidth="max-w-2xl">
  <div className="p-6">
    <h2>Modal Title</h2>
    <p>Modal content goes here</p>
  </div>
</Modal>
```

### Form Components

#### AssetSelector

A complex form component for selecting assets (XCH, CAT tokens, NFTs, etc.) with amount input, asset type selection, and token search.

**Sub-components:**

- `AmountInput` - Input for asset amounts
- `AssetIdInput` - Input for asset IDs
- `AssetTypeSelector` - Selector for asset types (XCH, CAT, NFT, Options)
- `TokenDropdown` - Dropdown for token selection
- `TokenSearchInput` - Search input for tokens
- `RemoveAssetButton` - Button to remove an asset

**Example:**

```tsx
import { AssetSelector } from '@/shared/ui'

;<AssetSelector assets={assets} onAssetsChange={handleChange} />
```

### Layout Components

#### DashboardLayout

Main layout wrapper for dashboard pages with navigation sidebar.

**Example:**

```tsx
import { DashboardLayout } from '@/shared/ui'

;<DashboardLayout>
  <YourPageContent />
</DashboardLayout>
```

#### WalletConnectionGuard

Route guard component that redirects users based on wallet connection state. Protects routes that require wallet connection.

**Example:**

```tsx
import { WalletConnectionGuard } from '@/shared/ui'

;<WalletConnectionGuard>
  <ProtectedContent />
</WalletConnectionGuard>
```

### Utility Components

#### CopyableHexString

Displays a hex string with copy-to-clipboard functionality. Automatically truncates long strings for display.

**Example:**

```tsx
import { CopyableHexString } from '@/shared/ui'

;<CopyableHexString hexString="0x1234567890abcdef..." />
```

### Icon Components

#### GithubIcon

Custom GitHub icon component.

#### XIcon

Custom X (Twitter) icon component.

**Example:**

```tsx
import { GithubIcon, XIcon } from '@/shared/ui'

<GithubIcon />
<XIcon />
```

## Import Patterns

### Named Imports (Recommended)

```tsx
import { Button, Modal, AssetSelector } from '@/shared/ui'
```

### Default Imports

```tsx
import Button from '@/shared/ui/Button'
import Modal from '@/shared/ui/Modal'
```

### Sub-component Imports

```tsx
import { AmountInput, TokenDropdown } from '@/shared/ui'
// or
import AmountInput from '@/shared/ui/AssetSelector/AmountInput'
```

## Design Principles

1. **Consistency**: All components follow the same design patterns and styling approach
2. **Accessibility**: Components are built with accessibility in mind
3. **Theme Support**: All components support dark/light theme via `useThemeClasses` hook
4. **Type Safety**: Full TypeScript support with proper type definitions
5. **Reusability**: Components are designed to be flexible and reusable across the application

## Adding New Components

When adding a new component to the library:

1. Create the component file in `shared/ui/` or appropriate subdirectory
2. Export it from `shared/ui/index.ts` with JSDoc documentation
3. Add it to this README with usage examples
4. Follow existing component patterns and naming conventions
5. Ensure TypeScript types are properly defined
6. Support dark/light theme if applicable

## Component Naming Convention

- Use PascalCase for component names
- Use descriptive, clear names
- Group related components in subdirectories
- Export from index.ts for easy discovery
