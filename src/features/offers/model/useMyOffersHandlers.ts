/**
 * Handler functions for useMyOffers hook
 * Extracted to reduce complexity and improve maintainability
 */

import type { OfferDetails } from '@/entities/offer'
import { logger } from '@/shared/lib/logger'

/**
 * Create offer event for window dispatch
 */
export function createOfferCreatedEvent(offer: OfferDetails): CustomEvent {
  return new CustomEvent('offer-created', {
    detail: {
      offer,
      offerString: offer.offerString,
      source: 'offer-page',
    },
  })
}

/**
 * Update offer status in state
 */
export function updateOfferStatus(
  offers: OfferDetails[],
  offerId: string,
  status: 'completed' | 'cancelled'
): OfferDetails[] {
  return offers.map((o) => (o.id === offerId ? { ...o, status } : o))
}

/**
 * Remove offer from state
 */
export function removeOfferFromState(offers: OfferDetails[], offerId: string): OfferDetails[] {
  return offers.filter((o) => o.id !== offerId)
}

/**
 * Update offer in state
 */
export function updateOfferInState(
  offers: OfferDetails[],
  updatedOffer: OfferDetails
): OfferDetails[] {
  return offers.map((o) => (o.id === updatedOffer.id ? { ...o, ...updatedOffer } : o))
}

/**
 * Cancel a single offer
 */
export async function cancelSingleOffer(
  offer: OfferDetails,
  cancelOfferMutation: {
    mutateAsync: (params: { id: string; fee: number }) => Promise<unknown>
  },
  updateOffer: (id: string, updates: { status: 'cancelled' }) => Promise<void>
): Promise<void> {
  await cancelOfferMutation.mutateAsync({
    id: offer.tradeId,
    fee: offer.fee,
  })
  await updateOffer(offer.id, { status: 'cancelled' })
}

/**
 * Cancel all active offers
 */
export async function cancelAllActiveOffers(
  activeOffers: OfferDetails[],
  cancelOfferMutation: {
    mutateAsync: (params: { id: string; fee: number }) => Promise<unknown>
  },
  updateOffer: (id: string, updates: { status: 'cancelled' }) => Promise<void>
): Promise<void> {
  const cancelPromises = activeOffers.map(async (offer) => {
    try {
      await cancelSingleOffer(offer, cancelOfferMutation, updateOffer)
    } catch (error) {
      logger.error(`Failed to cancel offer ${offer.id}:`, error)
    }
  })

  await Promise.allSettled(cancelPromises)
}
