import type { DexieOffer } from '@/features/offers/lib/dexieTypes'
import type { OrderBookOrder } from './orderBookTypes'

/**
 * Convert Dexie offer to OrderBookOrder format
 */
export function convertDexieOfferToOrderBookOrder(
  dexieOffer: DexieOffer,
  network: 'mainnet' | 'testnet'
): OrderBookOrder {
  // Ensure amounts are numbers and handle undefined/null values
  const safeOffered = dexieOffer.offered.map((item) => ({
    ...item,
    amount: typeof item.amount === 'number' ? item.amount : 0,
  }))
  const safeRequested = dexieOffer.requested.map((item) => ({
    ...item,
    amount: typeof item.amount === 'number' ? item.amount : 0,
  }))

  // Calculate USD values - for now set to 0 since we don't have real prices
  const offeringUsdValue = 0
  const requestingUsdValue = 0

  // Calculate XCH values - only count native token amounts
  const offeringXchValue = calculateXchValue(safeOffered, network)
  const requestingXchValue = calculateXchValue(safeRequested, network)

  // Calculate pricePerUnit from actual amounts when there's one asset on each side
  const pricePerUnit = calculatePricePerUnit(safeOffered, safeRequested)

  return {
    id: dexieOffer.id,
    offering: safeOffered,
    requesting: safeRequested,
    maker: formatMakerAddress(dexieOffer.id),
    timestamp: new Date(dexieOffer.date_found).toLocaleTimeString(),
    offeringUsdValue,
    requestingUsdValue,
    offeringXchValue,
    requestingXchValue,
    pricePerUnit,
    status: dexieOffer.status,
    date_found: dexieOffer.date_found,
    date_completed: dexieOffer.date_completed,
    date_pending: dexieOffer.date_pending,
    date_expiry: dexieOffer.date_expiry,
    known_taker: dexieOffer.known_taker,
  }
}

/**
 * Calculate XCH value from assets array
 */
function calculateXchValue(
  assets: Array<{ code?: string; amount: number }>,
  network: 'mainnet' | 'testnet'
): number {
  const nativeTicker = network === 'testnet' ? 'TXCH' : 'XCH'
  return assets.reduce((sum: number, item) => {
    if (item.code === nativeTicker || item.code === 'TXCH' || item.code === 'XCH' || !item.code) {
      return sum + item.amount
    }
    return sum
  }, 0)
}

/**
 * Calculate price per unit
 */
function calculatePricePerUnit(
  safeOffered: Array<{ amount: number }>,
  safeRequested: Array<{ amount: number }>
): number {
  if (safeOffered.length === 1 && safeRequested.length === 1 && safeOffered[0]?.amount > 0) {
    return safeRequested[0].amount / safeOffered[0].amount
  }
  return 0
}

/**
 * Format maker address for display
 */
function formatMakerAddress(offerId: string): string {
  return `0x${offerId.substring(0, 8)}...${offerId.substring(offerId.length - 8)}`
}
