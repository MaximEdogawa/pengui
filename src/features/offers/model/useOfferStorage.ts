'use client'

import type { OfferDetails } from '@/entities/offer'
import type { StoredOffer } from '@/shared/lib/database/indexedDB'
import { logger } from '@/shared/lib/logger'
import {
  offerStorageService,
  type OfferStorageOptions,
  type PaginatedOffersResult,
} from '@/shared/lib/services/offerStorageService'
import { useCallback, useMemo, useState } from 'react'

export function useOfferStorage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offers, setOffers] = useState<StoredOffer[]>([])
  const [pagination, setPagination] = useState<{
    total: number
    page: number
    pageSize: number
    totalPages: number
  } | null>(null)

  // Computed properties
  const localOffers = useMemo(() => offers.filter((offer) => offer.isLocal), [offers])
  const syncedOffers = useMemo(() => offers.filter((offer) => !offer.isLocal), [offers])
  const activeOffers = useMemo(() => offers.filter((offer) => offer.status === 'active'), [offers])
  const cancelledOffers = useMemo(
    () => offers.filter((offer) => offer.status === 'cancelled'),
    [offers]
  )

  /**
   * Load offers from IndexedDB
   */
  const loadOffers = useCallback(async (options: OfferStorageOptions = {}) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await offerStorageService.getOffers(options)

      // Handle paginated result
      if (result && typeof result === 'object' && 'offers' in result) {
        const paginatedResult = result as PaginatedOffersResult
        setOffers(paginatedResult.offers)
        setPagination({
          total: paginatedResult.total,
          page: paginatedResult.page,
          pageSize: paginatedResult.pageSize,
          totalPages: paginatedResult.totalPages,
        })
      } else {
        // Handle non-paginated result (array)
        const offersArray = result as StoredOffer[]
        setOffers(offersArray)
        setPagination(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load offers')
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Save a new offer
   */
  const saveOffer = useCallback(async (offer: OfferDetails, isLocal: boolean = true) => {
    setIsLoading(true)
    setError(null)

    try {
      const walletAddress: string | undefined = undefined
      const savedOffer = await offerStorageService.saveOffer(offer, isLocal, walletAddress)
      setOffers((prev) => [savedOffer, ...prev])
      return savedOffer
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save offer')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Update an existing offer
   */
  const updateOffer = useCallback(async (offerId: string, updates: Partial<OfferDetails>) => {
    setIsLoading(true)
    setError(null)

    try {
      await offerStorageService.updateOffer(offerId, updates)

      // Update local state directly instead of reloading all offers
      // This prevents infinite loops and improves performance
      setOffers((prev) =>
        prev.map((offer) => {
          if (offer.id === offerId) {
            return {
              ...offer,
              ...updates,
              lastModified: new Date(),
            } as StoredOffer
          }
          return offer
        })
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update offer')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Delete an offer
   */
  const deleteOffer = useCallback(async (offerId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      await offerStorageService.deleteOffer(offerId)

      // Update local state directly by removing the deleted offer
      // This ensures immediate UI update and avoids unnecessary reloads
      setOffers((prev) => prev.filter((offer) => offer.id !== offerId))

      // Update pagination if it exists
      setPagination((prev) => {
        if (!prev) return null
        return {
          ...prev,
          total: Math.max(0, prev.total - 1),
          totalPages: Math.ceil(Math.max(0, prev.total - 1) / prev.pageSize),
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete offer')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Get offers by status
   */
  const getOffersByStatus = useCallback(async (status: string, walletAddress?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const statusOffers = await offerStorageService.getOffersByStatus(status, walletAddress)
      return statusOffers
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get offers by status')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Get unsynced offers
   */
  const getUnsyncedOffers = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const unsyncedOffers = await offerStorageService.getUnsyncedOffers()
      return unsyncedOffers
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get unsynced offers')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Mark offers as synced
   */
  const markOffersAsSynced = useCallback(async (offerIds: string[]) => {
    setIsLoading(true)
    setError(null)

    try {
      await offerStorageService.markOffersAsSynced(offerIds)

      // Update local state
      setOffers((prev) =>
        prev.map((offer) => {
          if (offerIds.includes(offer.id)) {
            return {
              ...offer,
              isLocal: false,
              syncedAt: new Date(),
              lastModified: new Date(),
            }
          }
          return offer
        })
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark offers as synced')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Clear all offers
   */
  const clearAllOffers = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      await offerStorageService.clearAllOffers()
      // Always update state, even if there's an error, to prevent UI from hanging
      setOffers([])
      setPagination(null) // Reset pagination when clearing all offers
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to clear offers'
      setError(errorMsg)
      // Still clear local state to prevent UI from showing stale data
      setOffers([])
      setPagination(null)
      // Don't throw - let the UI handle the error state
      logger.error('Failed to clear all offers:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Get database statistics
   */
  const getStats = useCallback(async () => {
    return await offerStorageService.getStats()
  }, [])

  return {
    // State
    isLoading,
    error,
    offers,
    pagination,

    // Computed
    localOffers,
    syncedOffers,
    activeOffers,
    cancelledOffers,

    // Methods
    loadOffers,
    saveOffer,
    updateOffer,
    deleteOffer,
    getOffersByStatus,
    getUnsyncedOffers,
    markOffersAsSynced,
    clearAllOffers,
    getStats,
  }
}
