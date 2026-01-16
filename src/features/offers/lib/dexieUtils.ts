import {  type OfferState } from '@/entities/offer'

export { calculateOfferState } from '@/entities/offer'

export function isOfferCompleted(state: OfferState): boolean {
  return state === 'Completed'
}

export function isOfferCancelled(state: OfferState): boolean {
  return state === 'Cancelled'
}

export function isOfferActive(state: OfferState): boolean {
  return state === 'Open' || state === 'Pending'
}

export function isOfferFinalized(state: OfferState): boolean {
  return state === 'Completed' || state === 'Cancelled' || state === 'Expired'
}
