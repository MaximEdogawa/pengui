# Component Catalog

Quick reference guide for all available components in the shared UI library.

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
- **DashboardLayout** - Dashboard layout wrapper
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

- DashboardLayout
- WalletConnectionGuard

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

// Direct import (also works)
import Button from '@/shared/ui/Button'
import Modal from '@/shared/ui/Modal'
```

## Component Quick Reference

| Component             | Category | Props                        | Use Case                     |
| --------------------- | -------- | ---------------------------- | ---------------------------- |
| Button                | Action   | variant, size, icon, onClick | Interactive buttons          |
| Modal                 | Overlay  | onClose, maxWidth            | Dialogs and overlays         |
| AssetSelector         | Form     | assets, onAssetsChange       | Asset selection forms        |
| AmountInput           | Form     | value, type, onChange        | Amount input fields          |
| CopyableHexString     | Display  | hexString                    | Display copyable hex strings |
| DashboardLayout       | Layout   | children                     | Page layout wrapper          |
| WalletConnectionGuard | Layout   | children                     | Route protection             |

## Need Help?

See [README.md](./README.md) for detailed documentation and examples.
