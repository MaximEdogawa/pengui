/**
 * Shared UI Component Library
 *
 * This is a custom-built component library for the Penguin Pool application.
 * All components are self-programmed and reusable across the application.
 *
 * Usage:
 *   import { Button, Modal } from '@/shared/ui'
 *   import Button from '@/shared/ui/Button'
 *
 * Search for components:
 *   - Button: Primary button component with variants
 *   - Modal: Overlay modal/dialog component
 *   - Input: Form input components
 *   - Layout: Layout components
 *   - Icons: Custom icon components
 */

// ============================================================================
// PRIMITIVE COMPONENTS
// ============================================================================

/**
 * Button Component
 *
 * A versatile button component with multiple variants, sizes, and icon support.
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="md" onClick={handleClick}>
 *   Click Me
 * </Button>
 * ```
 *
 * Variants: primary, secondary, danger, success, warning, info
 * Sizes: sm, md, lg
 */
export { default as Button } from './Button'
export type { ButtonProps } from './Button'

/**
 * Modal Component
 *
 * A modal/dialog overlay component with backdrop blur and customizable width.
 *
 * @example
 * ```tsx
 * <Modal onClose={handleClose} maxWidth="max-w-2xl">
 *   <div>Modal Content</div>
 * </Modal>
 * ```
 */
export { default as Modal } from './Modal'
export type { ModalProps } from './Modal'

// ============================================================================
// FORM COMPONENTS
// ============================================================================

/**
 * AssetSelector Component
 *
 * A complex form component for selecting assets (XCH, CAT tokens, NFTs, etc.)
 * with amount input, asset type selection, and token search.
 *
 * @example
 * ```tsx
 * <AssetSelector
 *   assets={assets}
 *   onAssetsChange={handleChange}
 * />
 * ```
 */
export { default as AssetSelector } from './AssetSelector'
export type { ExtendedAsset as ExtendedOfferAsset, AssetSelectorProps } from './AssetSelector'

// AssetSelector sub-components
export { default as AmountInput } from './AssetSelector/AmountInput'
export { default as AssetIdInput } from './AssetSelector/AssetIdInput'
export { default as AssetTypeSelector } from './AssetSelector/AssetTypeSelector'
export { default as TokenDropdown } from './AssetSelector/TokenDropdown'
export { default as TokenSearchInput } from './AssetSelector/TokenSearchInput'
export { default as RemoveAssetButton } from './AssetSelector/RemoveAssetButton'

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

/**
 * CopyableHexString Component
 *
 * Displays a hex string with copy-to-clipboard functionality.
 * Automatically truncates long strings for display.
 *
 * @example
 * ```tsx
 * <CopyableHexString hexString="0x1234..." />
 * ```
 */
export { CopyableLongHexString as CopyableHexString } from './CopyableHexString'

// ============================================================================
// LAYOUT COMPONENTS
// ============================================================================

/**
 * DashboardLayout Component
 *
 * Main layout wrapper for dashboard pages with navigation sidebar.
 *
 * @example
 * ```tsx
 * <DashboardLayout>
 *   <YourPageContent />
 * </DashboardLayout>
 * ```
 */
export { default as DashboardLayout } from './DashboardLayout'

/**
 * WalletConnectionGuard Component
 *
 * Route guard component that redirects users based on wallet connection state.
 * Protects routes that require wallet connection.
 *
 * @example
 * ```tsx
 * <WalletConnectionGuard>
 *   <ProtectedContent />
 * </WalletConnectionGuard>
 * ```
 */
export { default as WalletConnectionGuard } from './WalletConnectionGuard'

// ============================================================================
// BRANDING COMPONENTS
// ============================================================================

/**
 * PenguinLogo Component
 *
 * The Penguin Pool application logo component.
 */
export { default as PenguinLogo } from './PenguinLogo'

// ============================================================================
// ICON COMPONENTS
// ============================================================================

/**
 * Custom icon components
 */
export { default as GithubIcon } from './icons/GithubIcon'
export { default as XIcon } from './icons/XIcon'
