/**
 * Chia Asset ID Constants
 *
 * These constants define the asset IDs for Chia native tokens (XCH and TXCH).
 * Used throughout the application for asset identification and filtering.
 */

/**
 * Asset IDs for Chia native tokens
 */
export const CHIA_ASSET_IDS = {
  /**
   * XCH (Chia mainnet native token)
   * Asset ID is empty string for wallet requests
   */
  XCH: '',

  /**
   * XCH string identifier (used in some contexts)
   */
  XCH_STRING: 'xch',

  /**
   * TXCH (Chia testnet native token)
   * Asset ID: d82dd03f8a9ad2f84353cd953c4de6b21dbaaf7de3ba3f4ddd9abe31ecba80ad
   */
  TXCH: 'd82dd03f8a9ad2f84353cd953c4de6b21dbaaf7de3ba3f4ddd9abe31ecba80ad',

  /**
   * TXCH string identifier (used in some contexts)
   */
  TXCH_STRING: 'TXCH',
} as const

/**
 * Set of all XCH/TXCH asset IDs for quick lookup
 */
export const XCH_ASSET_IDS = new Set([
  CHIA_ASSET_IDS.XCH,
  CHIA_ASSET_IDS.XCH_STRING,
  CHIA_ASSET_IDS.TXCH,
  CHIA_ASSET_IDS.TXCH_STRING,
])

/**
 * Set of XCH/TXCH base currency strings (used in ticker filtering)
 */
export const XCH_BASE_CURRENCIES = new Set<string>([
  CHIA_ASSET_IDS.XCH_STRING,
  CHIA_ASSET_IDS.TXCH_STRING,
])

/**
 * Check if an asset ID is XCH or TXCH
 */
export function isChiaNativeToken(assetId: string): boolean {
  return (
    assetId === CHIA_ASSET_IDS.XCH ||
    assetId === CHIA_ASSET_IDS.XCH_STRING ||
    assetId === CHIA_ASSET_IDS.TXCH ||
    assetId === CHIA_ASSET_IDS.TXCH_STRING
  )
}

/**
 * Check if an asset ID is XCH (mainnet only)
 */
export function isXch(assetId: string): boolean {
  return assetId === CHIA_ASSET_IDS.XCH || assetId === CHIA_ASSET_IDS.XCH_STRING
}

/**
 * Check if an asset ID is TXCH (testnet only)
 */
export function isTxch(assetId: string): boolean {
  return assetId === CHIA_ASSET_IDS.TXCH || assetId === CHIA_ASSET_IDS.TXCH_STRING
}
