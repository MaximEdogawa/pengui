# Storybook Component Catalog

Complete list of all components available in Storybook, organized by category following Feature-Sliced Design principles.

**Note**: Storybook stories are located in `storybook-stories/` at the project root and are completely separate from the application code in `src/`. Components work independently without Storybook dependencies.

## Quick Start

View all components in Storybook:
```bash
bun run storybook
```

Then open [http://localhost:6006](http://localhost:6006) in your browser.

## Component Categories

### 🎨 Primitive Components

Basic building blocks for UI construction.

#### Button
- **Path**: `Shared UI/Primitive/Button`
- **Location**: `src/shared/ui/primitives/button/Button.tsx`
- **Stories**: ✅ `Button.stories.tsx`
- **Props**: `variant`, `size`, `disabled`, `icon`, `fullWidth`, `onClick`, `type`
- **Variants**: `primary`, `secondary`, `danger`, `success`, `warning`, `info`
- **Sizes**: `sm`, `md`, `lg`

#### Modal
- **Path**: `Shared UI/Primitive/Modal`
- **Location**: `src/shared/ui/primitives/modal/Modal.tsx`
- **Stories**: ✅ `Modal.stories.tsx`
- **Props**: `onClose`, `maxWidth`, `closeOnOverlayClick`, `className`
- **Features**: Backdrop blur, customizable width, click-outside to close

---

### 📝 Form Components

Components for building forms and handling user input.

#### AssetSelector
- **Path**: `Shared UI/Forms/AssetSelector`
- **Location**: `src/shared/ui/forms/asset-selector/AssetSelector.tsx`
- **Stories**: ✅ `AssetSelector.stories.tsx`
- **Props**: `asset`, `onUpdate`, `onRemove`, `placeholder`, `showRemoveButton`, `enabledAssetTypes`
- **Sub-components**: See below

#### AmountInput
- **Path**: `Shared UI/Forms/AmountInput`
- **Location**: `src/shared/ui/forms/asset-selector/AmountInput.tsx`
- **Stories**: ✅ `AmountInput.stories.tsx`
- **Props**: `value`, `tempInput`, `type`, `onChange`, `onBlur`
- **Asset Types**: `xch`, `cat`, `nft`, `option`
- **Features**: Validates input based on asset type (NFT = integers only, tokens = decimals)

#### AssetIdInput
- **Path**: `Shared UI/Forms/AssetIdInput`
- **Location**: `src/shared/ui/forms/asset-selector/AssetIdInput.tsx`
- **Stories**: ✅ `AssetIdInput.stories.tsx`
- **Props**: `value`, `onChange`, `placeholder`
- **Features**: Theme-aware input for asset IDs

#### AssetTypeSelector
- **Path**: `Shared UI/Forms/AssetTypeSelector`
- **Location**: `src/shared/ui/forms/asset-selector/AssetTypeSelector.tsx`
- **Stories**: ✅ `AssetTypeSelector.stories.tsx`
- **Props**: `value`, `onChange`, `enabledAssetTypes`
- **Options**: `cat`, `nft`, `option`

#### TokenDropdown
- **Path**: `Shared UI/Forms/TokenDropdown`
- **Location**: `src/shared/ui/forms/asset-selector/TokenDropdown.tsx`
- **Stories**: ✅ `TokenDropdown.stories.tsx`
- **Props**: `tokens`, `isOpen`, `onSelect`, `onClose`, `searchValue`
- **Features**: Portal-based dropdown, keyboard navigation, backdrop blur

#### TokenSearchInput
- **Path**: `Shared UI/Forms/TokenSearchInput`
- **Location**: `src/shared/ui/forms/asset-selector/TokenSearchInput.tsx`
- **Stories**: ✅ `TokenSearchInput.stories.tsx`
- **Props**: `value`, `onChange`, `onFocus`, `onBlur`, `placeholder`, `disabled`, `filteredTokens`, `onSelectToken`, `isDropdownOpen`, `onCloseDropdown`
- **Features**: Integrated search with dropdown, token filtering

#### RemoveAssetButton
- **Path**: `Shared UI/Forms/RemoveAssetButton`
- **Location**: `src/shared/ui/forms/asset-selector/RemoveAssetButton.tsx`
- **Stories**: ✅ `RemoveAssetButton.stories.tsx`
- **Props**: `onRemove`
- **Features**: Red-themed remove button with hover states

---

### 🎯 Utility Components

Helper components for common UI patterns.

#### CopyableHexString
- **Path**: `Shared UI/Utility/CopyableHexString`
- **Location**: `src/shared/ui/utilities/copyable-hex-string/CopyableHexString.tsx`
- **Stories**: ✅ `CopyableHexString.stories.tsx`
- **Props**: `hexString`, `className`, `tooltipText`
- **Features**: Auto-truncates long hex strings, click to copy, visual feedback

---

### 🎨 Layout Components

Components for page structure and navigation.

#### NetworkPicker
- **Path**: `Shared UI/Layout/NetworkPicker`
- **Location**: `src/shared/ui/layout/network-picker/NetworkPicker.tsx`
- **Stories**: ✅ `NetworkPicker.stories.tsx`
- **Props**: None (uses context)
- **Features**: Network switching (mainnet/testnet), theme-aware, loading states
- **Dependencies**: Requires `NetworkProvider` (provided in Storybook decorators)

---

### 🎨 Branding Components

Brand identity and logo components.

#### PenguinLogo
- **Path**: `Shared UI/Branding/PenguinLogo`
- **Location**: `src/shared/ui/branding/penguin-logo/PenguinLogo.tsx`
- **Stories**: ✅ `PenguinLogo.stories.tsx`
- **Props**: `size`, `className`, `fill`, `priority`
- **Features**: Fixed size or fill container, Next.js Image optimization

---

### 🎨 Icon Components

Custom icon components.

#### Icons
- **Path**: `Shared UI/Icons`
- **Location**: `src/shared/ui/icons/`
- **Stories**: ✅ `Icons.stories.tsx`
- **Components**:
  - `GithubIcon` - GitHub logo icon
  - `XIcon` - X (Twitter) logo icon
- **Features**: SVG-based, theme-aware colors

---

## Component Statistics

### Total Components: 14

- ✅ **With Stories**: 14 (100%)
- 📝 **Form Components**: 7
- 🎨 **Primitive Components**: 2
- 🎯 **Utility Components**: 1
- 📐 **Layout Components**: 1
- 🎨 **Branding Components**: 1
- 🎨 **Icon Components**: 2

---

## Storybook Organization

All components are organized in Storybook using the following naming convention:

```
Shared UI/
├── Primitive/
│   ├── Button
│   └── Modal
├── Forms/
│   ├── AssetSelector
│   ├── AmountInput
│   ├── AssetIdInput
│   ├── AssetTypeSelector
│   ├── TokenDropdown
│   ├── TokenSearchInput
│   └── RemoveAssetButton
├── Utility/
│   └── CopyableHexString
├── Layout/
│   └── NetworkPicker
├── Branding/
│   └── PenguinLogo
└── Icons/
    └── (GithubIcon, XIcon)
```

---

## Component Dependencies

### Context Providers Required

Some components require specific context providers to function correctly. These are automatically provided in Storybook via decorators:

- **NetworkProvider**: Required by `NetworkPicker`, `AssetSelector` (via `useCatTokens`)
- **ReactQueryProvider**: Required by `AssetSelector` (via `useCatTokens`)
- **ThemeProvider**: Required for theme support (dark/light mode)

All providers are configured in `.storybook/StoryWrapper.tsx` and applied globally via `.storybook/preview.ts`.

---

## Import Examples

```tsx
// Import from shared UI barrel export (recommended)
import { Button, Modal, AssetSelector } from '@/shared/ui'

// Import specific component by category
import { Button } from '@/shared/ui/primitives/button'
import { Modal } from '@/shared/ui/primitives/modal'
import { AssetSelector } from '@/shared/ui/forms/asset-selector'
import { NetworkPicker } from '@/shared/ui/layout/network-picker'
import { CopyableHexString } from '@/shared/ui/utilities/copyable-hex-string'
import { PenguinLogo } from '@/shared/ui/branding/penguin-logo'

// Import with types
import { Button, type ButtonProps } from '@/shared/ui'
```

---

## Feature-Sliced Design Compliance

All components in this catalog are part of the `shared/ui` layer, which means:

✅ **Can be imported by**: `app`, `pages`, `widgets`, `features`, `entities`  
✅ **Cannot import from**: `widgets`, `features`, `entities`, `app`  
✅ **Can import from**: `shared/lib`, `shared/hooks`, `shared/api`  
✅ **Location**: `src/shared/ui/`

---

## Missing Components

The following components are exported from `shared/ui` but don't have Storybook stories yet:

- ❌ `WalletConnectionGuard` - Route guard component (not suitable for Storybook due to routing dependencies)

---

## Adding New Components

When adding a new component to Storybook:

1. Create the component in the appropriate category folder in `src/shared/ui/`:
   - `src/shared/ui/primitives/[component-name]/` for basic building blocks
   - `src/shared/ui/forms/[component-name]/` for form components
   - `src/shared/ui/layout/[component-name]/` for layout components
   - `src/shared/ui/utilities/[component-name]/` for utility components
   - `src/shared/ui/branding/[component-name]/` for branding components
   - `src/shared/ui/icons/` for icon components
2. Export from `src/shared/ui/[category]/[component-name]/index.ts`
3. Add to `src/shared/ui/index.ts` barrel export
4. Create `[ComponentName].stories.tsx` in `storybook-stories/[category]/[component-name]/`
5. Import the component in the story file using path aliases (e.g., `@/shared/ui/primitives/button`)
6. Update this document with the new component
7. Update `src/shared/ui/COMPONENT_CATALOG.md`

---

## Storybook Configuration

- **Framework**: `@storybook/nextjs-vite`
- **Build Tool**: Vite
- **Addons**: 
  - `@storybook/addon-a11y` - Accessibility testing
  - `@storybook/addon-docs` - Documentation
- **Global Decorators**: `StoryWrapper` (provides all necessary context providers)
- **Static Assets**: `public/` directory

---

## Related Documentation

- [Component Catalog](../src/shared/ui/COMPONENT_CATALOG.md) - Quick reference guide
- [Shared UI README](../src/shared/ui/README.md) - Detailed component documentation
- [FSD Structure](./architecture/fsd-structure.md) - Architecture overview
