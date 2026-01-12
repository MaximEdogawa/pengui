/**
 * Asset and Ticker types for the Penguin Pool application
 * These types are used throughout the app for asset selection, offers, and wallet requests
 */

import type { AssetAmount, AssetType } from '../offer/types'

/**
 * Ticker information from Dexie API
 * Represents a trading pair with base and target currencies
 */
export interface Ticker {
  tickerId: string
  baseCurrency: string // Asset ID of the base currency (CAT token asset ID)
  targetCurrency: string // Asset ID of the target currency (usually XCH)
  baseCode: string // Ticker symbol (e.g., "BYC03", "TDBX")
  targetCode: string // Target currency code (e.g., "TXCH", "XCH")
  baseName: string // Full name of the base currency
  targetName: string // Full name of the target currency
  lastPrice: number
  currentAvgPrice: number
  baseVolume: number
  targetVolume: number
  poolId: string
  bid: number | null
  ask: number | null
  high: number | null
  low: number | null
}

/**
 * Asset information derived from tickers
 * Used for asset selection and display throughout the app
 */
export interface Asset {
  assetId: string // The actual asset ID (base_currency from ticker)
  ticker: string // Ticker symbol (base_code from ticker)
  name: string // Full name (base_name from ticker)
  symbol: string // Same as ticker for CAT tokens
  type: AssetType
}

/**
 * Base asset interface for offers and transactions
 * This is the standard format used throughout the app
 */
export interface BaseAsset {
  assetId: string
  amount: AssetAmount
  type: AssetType
  symbol?: string
  name?: string
}

/**
 * Wallet request asset format
 * Used when sending requests to the wallet (assetId is empty string for XCH)
 */
export interface WalletAsset {
  assetId: string // Empty string for XCH, asset ID for CAT/NFT/Options
  amount: number // Amount in smallest unit (mojos for XCH, smallest unit for CAT)
}

/**
 * Asset mapping utilities
 * Converts between different asset representations
 */

/**
 * Convert BaseAsset to WalletAsset format
 * Used when creating offers or sending wallet requests
 */
export function toWalletAsset(
  asset: BaseAsset,
  convertToSmallestUnit: (amount: number, type: AssetType) => number
): WalletAsset {
  return {
    assetId: asset.type === 'xch' ? '' : asset.assetId,
    amount: convertToSmallestUnit(asset.amount, asset.type),
  }
}

/**
 * Convert WalletAsset to BaseAsset format
 * Used when receiving data from wallet or parsing offers
 */
export function fromWalletAsset(
  walletAsset: WalletAsset,
  convertFromSmallestUnit: (amount: number, type: AssetType) => number,
  assetType: AssetType = 'cat' // Default to CAT if not specified
): BaseAsset {
  const resolvedType: AssetType = walletAsset.assetId === '' ? 'xch' : assetType

  return {
    assetId: walletAsset.assetId || '',
    amount: convertFromSmallestUnit(walletAsset.amount, resolvedType),
    type: resolvedType,
  }
}

/**
 * Convert Ticker to Asset format
 * Used for asset selection and display
 */
export function tickerToAsset(ticker: Ticker): Asset {
  return {
    assetId: ticker.baseCurrency,
    ticker: ticker.baseCode,
    name: ticker.baseName,
    symbol: ticker.baseCode,
    type: 'cat', // Tickers from Dexie are always CAT tokens
  }
}

/**
 * Convert Asset to BaseAsset format
 * Used when creating offers from selected assets
 */
export function assetToBaseAsset(asset: Asset, amount: AssetAmount = 0): BaseAsset {
  return {
    assetId: asset.assetId,
    amount,
    type: asset.type,
    symbol: asset.symbol,
    name: asset.name,
  }
}

/**
 * Convert array of BaseAsset to WalletAsset array
 * Used when creating wallet requests (offers, transactions, etc.)
 *
 * @param assets - Array of BaseAsset to convert
 * @param convertToSmallestUnit - Function to convert amounts to smallest unit
 * @returns Array of WalletAsset ready for wallet requests
 */
export function toWalletAssets(
  assets: BaseAsset[],
  convertToSmallestUnit: (amount: number, type: AssetType) => number
): WalletAsset[] {
  return assets.map((asset) => toWalletAsset(asset, convertToSmallestUnit))
}

/**
 * Convert array of WalletAsset to BaseAsset array
 * Used when parsing wallet responses or offer data
 *
 * @param walletAssets - Array of WalletAsset to convert
 * @param convertFromSmallestUnit - Function to convert amounts from smallest unit
 * @param assetType - Default asset type if not specified (default: 'cat')
 * @returns Array of BaseAsset
 */
export function fromWalletAssets(
  walletAssets: WalletAsset[],
  convertFromSmallestUnit: (amount: number, type: AssetType) => number,
  assetType: AssetType = 'cat'
): BaseAsset[] {
  return walletAssets.map((walletAsset) =>
    fromWalletAsset(walletAsset, convertFromSmallestUnit, assetType)
  )
}
