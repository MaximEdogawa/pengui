/**
 * Network filtering utilities for offers
 */

import type { StoredOffer } from '@/shared/lib/database/indexedDB'

/**
 * Filter offers by network
 * Handles legacy offers without network field (includes them for mainnet only)
 * @param offers - Array of offers to filter
 * @param network - The network to filter by
 * @returns Filtered array of offers
 */
export function filterOffersByNetwork(
  offers: StoredOffer[],
  network: 'mainnet' | 'testnet'
): StoredOffer[] {
  return offers.filter((offer) => {
    // If offer doesn't have network field (old data), include it for mainnet only
    if (!offer.network) {
      return network === 'mainnet'
    }
    return offer.network === network
  })
}

/**
 * Check if an offer matches the current network
 * @param offer - The offer to check
 * @param network - The network to match against
 * @returns true if the offer matches the network
 */
export function offerMatchesNetwork(offer: StoredOffer, network: 'mainnet' | 'testnet'): boolean {
  // If offer doesn't have network field (old data), it matches mainnet only
  if (!offer.network) {
    return network === 'mainnet'
  }
  return offer.network === network
}
