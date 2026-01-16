import type { LoanOffer } from '@/entities/loan'

/**
 * Get status display text
 */
export function getLoanStatusText(status: LoanOffer['status']): string {
  if (status === 'available') return 'Available'
  if (status === 'funded') return 'Active'
  return 'Settled'
}

/**
 * Get status colors based on theme
 */
export function getLoanStatusColors(
  status: LoanOffer['status'],
  isDark: boolean
): string {
  if (status === 'available') {
    return isDark
      ? 'bg-green-500/20 text-green-300 border-green-500/30'
      : 'bg-green-100 text-green-800 border-green-300'
  }
  if (status === 'funded') {
    return isDark
      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      : 'bg-blue-100 text-blue-800 border-blue-300'
  }
  return isDark
    ? 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    : 'bg-gray-100 text-gray-800 border-gray-300'
}

/**
 * Get asset type colors based on theme
 */
export function getAssetTypeColors(assetType: string, isDark: boolean): string {
  if (assetType === 'CAT') {
    return isDark
      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      : 'bg-blue-100 text-blue-800 border-blue-300'
  }
  if (assetType === 'NFT') {
    return isDark
      ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
      : 'bg-purple-100 text-purple-800 border-purple-300'
  }
  return isDark
    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
    : 'bg-indigo-100 text-indigo-800 border-indigo-300'
}

/**
 * Get collateral asset type colors
 */
export function getCollateralAssetTypeColors(
  assetType: string,
  isDark: boolean
): string {
  if (assetType === 'CAT' || assetType === 'XCH') {
    return isDark ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-800'
  }
  if (assetType === 'NFT') {
    return isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-800'
  }
  return isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-800'
}
