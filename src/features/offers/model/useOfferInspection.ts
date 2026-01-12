'use client'

import { useDexieDataService } from '../api/useDexieDataService'
import type { DexieOfferSearchParams, DexiePostOfferParams } from '../lib/dexieTypes'

export type ValidatedOfferString = string & { readonly __validated: true }

/**
 * Hook for offer inspection and search using Dexie API
 * Provides a convenient interface for components to interact with Dexie
 */
export function useOfferInspection() {
  const dexieDataService = useDexieDataService()

  /**
   * Inspect a specific offer by Dexie ID
   */
  const inspectOffer = async (dexieId: string) => {
    return await dexieDataService.inspectOffer(dexieId)
  }

  /**
   * Inspect offer with polling functionality - checks every 20 seconds until expired/completed/cancelled
   */
  const inspectOfferWithPolling = async (dexieId: string, maxAttempts: number = 30) => {
    return await dexieDataService.inspectOfferWithPolling(dexieId, maxAttempts)
  }

  /**
   * Validate an offer string before processing
   */
  const validateOffer = (offerString: string): ValidatedOfferString => {
    if (!dexieDataService.validateOfferString(offerString)) {
      throw new Error('Invalid offer string format')
    }
    return offerString as ValidatedOfferString
  }

  /**
   * Search for offers with various filters
   */
  const searchOffers = async (params: DexieOfferSearchParams = {}) => {
    return await dexieDataService.searchOffers(params)
  }

  /**
   * Get offer by ID
   */
  const getOfferById = async (offerId: string) => {
    return await dexieDataService.inspectOffer(offerId)
  }

  /**
   * Post an offer to Dexie
   */
  const postOffer = async (params: DexiePostOfferParams) => {
    return await dexieDataService.postOffer(params)
  }

  /**
   * Search for offers by asset ID
   */
  const searchOffersByAsset = async (assetId: string, limit = 20) => {
    return await searchOffers({
      requested: assetId,
      page_size: limit,
      status: 0, // Only open offers
    })
  }

  /**
   * Search for offers by maker address
   */
  const searchOffersByMaker = async (makerAddress: string, limit = 20) => {
    return await searchOffers({
      maker: makerAddress,
      page_size: limit,
    })
  }

  /**
   * Get recent offers
   */
  const getRecentOffers = async (limit = 50) => {
    return await searchOffers({
      status: 0, // Only open offers
      page_size: limit,
    })
  }

  return {
    // Direct service access
    dexieDataService,

    // Convenience methods
    inspectOffer,
    inspectOfferWithPolling,
    searchOffers,
    getOfferById,
    postOffer,
    searchOffersByAsset,
    searchOffersByMaker,
    getRecentOffers,
    validateOffer,

    // Enhanced mutation access
    searchOffersMutation: dexieDataService.searchOffersMutation,
    inspectOfferMutation: dexieDataService.inspectOfferMutation,
    postOfferMutation: dexieDataService.postOfferMutation,

    // Loading states
    isLoading: dexieDataService.isLoading,
    isSearching: dexieDataService.isSearching,
    isInspecting: dexieDataService.isInspecting,
    isPosting: dexieDataService.isPosting,

    // Error state
    error: dexieDataService.error,

    // Data
    offers: dexieDataService.offers,
    currentOffer: dexieDataService.currentOffer,

    // Refresh functions
    refreshOffers: dexieDataService.refreshOffers,
  }
}
