# Component Catalog

Quick reference guide for all available components in the shared UI library.

## Storybook

Storybook stories are located in `storybook-stories/` at the project root and are completely separate from the application code. Components work independently without Storybook.

View all components in Storybook:
```bash
bun run storybook
```

Then open [http://localhost:6006](http://localhost:6006) in your browser.

## Search by Name

Type `Ctrl+F` (or `Cmd+F` on Mac) to search for components:

- **Button** - Interactive button component
- **Modal** - Overlay dialog component
- **AssetSelector** - Asset selection form
- **AmountInput** - Amount input field
- **AssetIdInput** - Asset ID input field
- **AssetTypeSelector** - Asset type selector
- **TokenDropdown** - Token dropdown selector
- **TokenSearchInput** - Token search input
- **RemoveAssetButton** - Remove asset button
- **CopyableHexString** - Copyable hex string display
- **NetworkPicker** - Network picker component
- **WalletConnectionGuard** - Wallet connection route guard
- **PenguinLogo** - Application logo
- **GithubIcon** - GitHub icon
- **XIcon** - X (Twitter) icon

## Search by Category

### Buttons & Actions

- Button
- RemoveAssetButton

### Forms & Inputs

- AssetSelector
- AmountInput
- AssetIdInput
- AssetTypeSelector
- TokenDropdown
- TokenSearchInput

### Overlays & Dialogs

- Modal

### Layout

- WalletConnectionGuard
- NetworkPicker

### Display

- CopyableHexString
- PenguinLogo

### Icons

- GithubIcon
- XIcon

## Quick Import Examples

```tsx
// Import single component
import { Button } from '@/shared/ui'
import { Modal } from '@/shared/ui'

// Import multiple components
import { Button, Modal, AssetSelector } from '@/shared/ui'

// Import with types
import { Button, type ButtonProps } from '@/shared/ui'
import { Modal, type ModalProps } from '@/shared/ui'

// Direct import from component folder (also works)
import { Button } from '@/shared/ui/primitives/button'
import { Modal } from '@/shared/ui/primitives/modal'
import { AssetSelector } from '@/shared/ui/forms/asset-selector'
import { NetworkPicker } from '@/shared/ui/layout/network-picker'
```

## Component Structure

All components are organized by category. Storybook stories are kept separate in `src/storybook/`:

```
shared/ui/
├── primitives/
│   ├── button/
│   │   ├── Button.tsx
│   │   └── index.ts
│   └── modal/
│       ├── Modal.tsx
│       └── index.ts
├── forms/
│   └── asset-selector/
│       ├── AssetSelector.tsx
│       ├── AmountInput.tsx
│       ├── AssetIdInput.tsx
│       └── index.ts
├── layout/
│   ├── network-picker/
│   └── wallet-connection-guard/
├── utilities/
│   └── copyable-hex-string/
├── branding/
│   └── penguin-logo/
└── icons/
    ├── GithubIcon.tsx
    └── XIcon.tsx

storybook-stories/       # Storybook stories (at project root, separate from app code)
├── primitives/
├── forms/
├── layout/
├── utilities/
├── branding/
└── icons/
```

## Component Quick Reference

| Component             | Category | Props                        | Use Case                     | Storybook |
| --------------------- | -------- | ---------------------------- | ---------------------------- | --------- |
| Button                | Action   | variant, size, icon, onClick | Interactive buttons          | ✅ |
| Modal                 | Overlay  | onClose, maxWidth            | Dialogs and overlays         | ✅ |
| AssetSelector         | Form     | assets, onAssetsChange       | Asset selection forms        | ✅ |
| AmountInput           | Form     | value, type, onChange        | Amount input fields          | ✅ |
| AssetIdInput          | Form     | value, onChange, placeholder | Asset ID input fields       | ✅ |
| AssetTypeSelector     | Form     | value, onChange, enabledTypes| Asset type selection         | ✅ |
| TokenDropdown         | Form     | tokens, isOpen, onSelect     | Token selection dropdown     | ✅ |
| TokenSearchInput      | Form     | value, onChange, tokens     | Token search with dropdown  | ✅ |
| RemoveAssetButton     | Form     | onRemove                     | Remove asset button          | ✅ |
| CopyableHexString     | Display  | hexString                    | Display copyable hex strings | ✅ |
| NetworkPicker         | Layout   | -                            | Network selection            | ✅ |
| PenguinLogo           | Branding | size, fill, priority         | Application logo             | ✅ |
| GithubIcon            | Icon     | -                            | GitHub icon                  | ✅ |
| XIcon                 | Icon     | -                            | X (Twitter) icon             | ✅ |
| WalletConnectionGuard | Layout   | children                     | Route protection             | ❌ |

## Storybook Stories

All shareable components now have Storybook stories! View them by running:
```bash
bun run storybook
```

### Component Categories in Storybook

- **Primitive Components**: Button, Modal
- **Form Components**: AssetSelector, AmountInput, AssetIdInput, AssetTypeSelector, TokenDropdown, TokenSearchInput, RemoveAssetButton
- **Utility Components**: CopyableHexString
- **Layout Components**: NetworkPicker
- **Branding Components**: PenguinLogo
- **Icon Components**: GithubIcon, XIcon

See [Storybook Component Catalog](../../docs/storybook-components.md) for the complete list and documentation.

## Need Help?

- See [README.md](./README.md) for detailed documentation and examples
- See [docs/architecture/fsd-structure.md](../../../docs/architecture/fsd-structure.md) for architecture overview
- Check Storybook for interactive component examples
