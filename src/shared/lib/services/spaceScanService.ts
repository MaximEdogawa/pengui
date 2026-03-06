/**
 * Space Scan API Service
 * Fetches token metadata and icons. In the browser, token list uses the app proxy to avoid CORS.
 */

import { logger } from '@/shared/lib/logger'
import { getSpaceScanApiUrl } from '@/shared/lib/utils/networkUtils'
import { SPACESCAN_TOKENS_PATH } from '@/shared/lib/constants/apiProxy'
import { getAdaptiveConfig } from '@/shared/lib/utils/networkQuality'

function createAbortTimeout(): { signal: AbortSignal; clear: () => void } {
  const cfg = getAdaptiveConfig()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), cfg.fetchTimeoutMs)
  return { signal: controller.signal, clear: () => clearTimeout(timer) }
}

const COMPRESSED_HEADERS: HeadersInit = {
  Accept: 'application/json',
  'Accept-Encoding': 'gzip, deflate, br',
}

// --- Address balance response types ---

export interface SpaceScanXchBalanceResponse {
  status: 'success' | 'error'
  xch: number
  mojo: number
}

export interface SpaceScanTokenBalance {
  asset_id: string
  name: string | null
  symbol: string | null
  preview_url: string | null
  balance: number
  price_xch: number | null
  price: number | null
  total_value: number | null
}

export interface SpaceScanTokenBalanceResponse {
  status: 'success' | 'error'
  data: SpaceScanTokenBalance[]
}

// --- Token metadata response types ---

export interface SpaceScanTokenInfo {
  asset_id: string
  token_id: string
  name: string
  description: string
  symbol: string
  preview_url: string | null
  twitter: string | null
  discord: string | null
  website: string | null
  precision: number
  type: string
}

export interface SpaceScanTokenResponse {
  status: 'success' | 'error'
  info: SpaceScanTokenInfo
}

export interface SpaceScanCatToken {
  asset_id: string
  token_id: string
  name: string
  description: string
  symbol: string
  preview_url: string | null
  tags?: string
  twitter?: string | null
  discord?: string | null
  website?: string | null
}

export interface SpaceScanTokensResponse {
  status: 'success' | 'error'
  cats: SpaceScanCatToken[]
}

/**
 * Fetch token information from Space Scan API by asset ID
 * @param assetId - The asset ID to look up
 * @returns Token information including preview_url for the icon
 */
export async function fetchTokenInfo(assetId: string): Promise<SpaceScanTokenInfo | null> {
  const baseUrl = getSpaceScanApiUrl()
  const url = `${baseUrl}/token/info/${assetId}`
  const { signal, clear } = createAbortTimeout()

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: COMPRESSED_HEADERS,
      signal,
    })

    if (!response.ok) {
      logger.warn(`Space Scan API error for asset ${assetId}:`, {
        status: response.status,
        statusText: response.statusText,
      })
      return null
    }

    const data: SpaceScanTokenResponse = await response.json()

    if (data.status !== 'success' || !data.info) {
      logger.warn(`Space Scan API returned non-success for asset ${assetId}`)
      return null
    }

    return data.info
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      logger.warn(`Space Scan request timed out for asset ${assetId}`)
      return null
    }
    logger.error(`Failed to fetch token info for asset ${assetId} from Space Scan:`, error)
    return null
  } finally {
    clear()
  }
}

/**
 * Fetch all CAT tokens. In the browser uses app proxy (CORS-safe); on server hits Space Scan directly.
 */
export async function fetchAllTokens(): Promise<SpaceScanCatToken[]> {
  const url =
    typeof window !== 'undefined'
      ? SPACESCAN_TOKENS_PATH
      : `${getSpaceScanApiUrl()}/tokens`
  const { signal, clear } = createAbortTimeout()

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: COMPRESSED_HEADERS,
      signal,
    })

    if (!response.ok) {
      logger.error('Space Scan API error fetching all tokens:', {
        status: response.status,
        statusText: response.statusText,
      })
      return []
    }

    const data: SpaceScanTokensResponse = await response.json()

    if (data.status !== 'success' || !data.cats) {
      logger.warn('Space Scan API returned non-success for all tokens')
      return []
    }

    return data.cats
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      logger.warn('Space Scan all-tokens request timed out')
      return []
    }
    logger.error('Failed to fetch all tokens from Space Scan:', error)
    return []
  } finally {
    clear()
  }
}

/**
 * Fetch the image from a preview URL and return it as a Blob
 * @param previewUrl - The URL of the image to fetch
 * @returns The image as a Blob, or null if fetch fails
 */
export async function fetchTokenImage(previewUrl: string): Promise<{ blob: Blob; mimeType: string } | null> {
  try {
    const response = await fetch(previewUrl, {
      method: 'GET',
    })

    if (!response.ok) {
      logger.warn(`Failed to fetch token image from ${previewUrl}:`, {
        status: response.status,
        statusText: response.statusText,
      })
      return null
    }

    const blob = await response.blob()
    const mimeType = response.headers.get('content-type') || blob.type || 'image/webp'

    return { blob, mimeType }
  } catch (error) {
    logger.error(`Failed to fetch token image from ${previewUrl}:`, error)
    return null
  }
}

/**
 * Get preview URL for a token by asset ID
 * This is a convenience function that fetches token info and returns just the preview URL
 * @param assetId - The asset ID to look up
 * @returns The preview URL or null if not found
 */
export async function getTokenPreviewUrl(assetId: string): Promise<string | null> {
  const tokenInfo = await fetchTokenInfo(assetId)
  return tokenInfo?.preview_url || null
}

// ---------------------------------------------------------------------------
// Address-balance endpoints (SpaceScan v1)
// ---------------------------------------------------------------------------

/**
 * Fetch XCH balance for a wallet address.
 * Endpoint: GET /address/xch-balance/{address}
 */
export async function fetchXchBalance(
  address: string,
  network: 'mainnet' | 'testnet' = 'mainnet',
): Promise<SpaceScanXchBalanceResponse | null> {
  const baseUrl = getSpaceScanApiUrl(network)
  const url = `${baseUrl}/address/xch-balance/${address}`
  const { signal, clear } = createAbortTimeout()

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: COMPRESSED_HEADERS,
      signal,
    })

    if (!response.ok) {
      logger.warn(`SpaceScan xch-balance error for ${address}:`, {
        status: response.status,
        statusText: response.statusText,
      })
      return null
    }

    const data: SpaceScanXchBalanceResponse = await response.json()
    if (data.status !== 'success') {
      logger.warn(`SpaceScan xch-balance returned non-success for ${address}`)
      return null
    }

    return data
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      logger.warn(`SpaceScan xch-balance request timed out for ${address}`)
      return null
    }
    logger.error(`Failed to fetch XCH balance for ${address}:`, error)
    return null
  } finally {
    clear()
  }
}

/**
 * Fetch all CAT token balances for a wallet address.
 * Endpoint: GET /address/token-balance/{address}
 *
 * Returns every token the address holds with its asset_id, balance, name and symbol.
 */
export async function fetchWalletTokenBalances(
  address: string,
  network: 'mainnet' | 'testnet' = 'mainnet',
): Promise<SpaceScanTokenBalance[]> {
  const baseUrl = getSpaceScanApiUrl(network)
  const url = `${baseUrl}/address/token-balance/${address}`
  const { signal, clear } = createAbortTimeout()

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: COMPRESSED_HEADERS,
      signal,
    })

    if (!response.ok) {
      logger.warn(`SpaceScan token-balance error for ${address}:`, {
        status: response.status,
        statusText: response.statusText,
      })
      return []
    }

    const data: SpaceScanTokenBalanceResponse = await response.json()
    if (data.status !== 'success' || !data.data) {
      logger.warn(`SpaceScan token-balance returned non-success for ${address}`)
      return []
    }

    return data.data
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      logger.warn(`SpaceScan token-balance request timed out for ${address}`)
      return []
    }
    logger.error(`Failed to fetch token balances for ${address}:`, error)
    return []
  } finally {
    clear()
  }
}
