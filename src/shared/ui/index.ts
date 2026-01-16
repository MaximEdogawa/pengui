/**
 * Shared UI Component Library
 *
 * This is a custom-built component library for the Penguin Pool application.
 * All components are self-programmed and reusable across the application.
 *
 * Components are organized by category:
 * - primitives/ - Basic building blocks (Button, Modal)
 * - forms/ - Form components (AssetSelector, inputs, etc.)
 * - layout/ - Layout components (NetworkPicker, WalletConnectionGuard)
 * - utilities/ - Utility components (CopyableHexString)
 * - branding/ - Branding components (PenguinLogo)
 * - icons/ - Icon components (GithubIcon, XIcon)
 *
 * Usage:
 *   import { Button, Modal } from '@/shared/ui'
 *   import { Button } from '@/shared/ui/primitives/button'
 */

// ============================================================================
// PRIMITIVE COMPONENTS
// ============================================================================

export { default as Button, type ButtonProps } from './primitives/button'
export { default as Modal, type ModalProps } from './primitives/modal'
export { Card, type CardProps } from './primitives/card'

// ============================================================================
// FORM COMPONENTS
// ============================================================================

export {
  AssetSelector,
  type ExtendedAsset,
  type AssetSelectorProps,
  AmountInput,
  AssetIdInput,
  AssetTypeSelector,
  TokenDropdown,
  TokenSearchInput,
  RemoveAssetButton,
} from './forms/asset-selector'
export { FormInput, type FormInputProps } from './forms/form-input'

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

export { CopyableHexString } from './utilities/copyable-hex-string'
export { EmptyState, type EmptyStateProps } from './utilities/empty-state'

// ============================================================================
// LAYOUT COMPONENTS
// ============================================================================

export { WalletConnectionGuard } from './layout/wallet-connection-guard'
export { NetworkPicker } from './layout/network-picker'
export { SectionHeader, type SectionHeaderProps } from './layout/section-header'

// ============================================================================
// BRANDING COMPONENTS
// ============================================================================

export { PenguinLogo } from './branding/penguin-logo'

// ============================================================================
// ICON COMPONENTS
// ============================================================================

export { default as GithubIcon } from './icons/GithubIcon'
export { default as XIcon } from './icons/XIcon'
