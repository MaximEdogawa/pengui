'use client'

import type { OfferDetails } from '@/entities/offer'
import type { StoredOffer } from '@/shared/lib/database/indexedDB'
import { logger } from '@/shared/lib/logger'
import { useNetwork } from '@/shared/hooks/useNetwork'
import {
  offerStorageService,
  type OfferStorageOptions,
  type PaginatedOffersResult,
} from '@/shared/lib/services/offerStorageService'
import { useCallback } from 'react'

interface UseOfferCRUDProps {
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setOffers: React.Dispatch<React.SetStateAction<StoredOffer[]>>
  setPagination: React.Dispatch<
    React.SetStateAction<{
      total: number
      page: number
      pageSize: number
      totalPages: number
    } | null>
  >
}

/**
 * Hook for offer CRUD operations
 */
export function useOfferCRUD({
  setIsLoading,
  setError,
  setOffers,
  setPagination,
}: UseOfferCRUDProps) {
  const { network } = useNetwork()

  /**
   * Load offers from IndexedDB
   */
  const loadOffers = useCallback(
    async (options: OfferStorageOptions = {}) => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await offerStorageService.getOffers({ ...options, network })

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
    },
    [network, setIsLoading, setError, setOffers, setPagination]
  )

  /**
   * Save a new offer
   */
  const saveOffer = useCallback(
    async (offer: OfferDetails, isLocal: boolean = true) => {
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
    },
    [setIsLoading, setError, setOffers]
  )

  /**
   * Update an existing offer
   */
  const updateOffer = useCallback(
    async (offerId: string, updates: Partial<OfferDetails>) => {
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
    },
    [setIsLoading, setError, setOffers]
  )

  /**
   * Delete an offer
   */
  const deleteOffer = useCallback(
    async (offerId: string) => {
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
    },
    [setIsLoading, setError, setOffers, setPagination]
  )

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
  }, [setIsLoading, setError, setOffers, setPagination])

  return {
    loadOffers,
    saveOffer,
    updateOffer,
    deleteOffer,
    clearAllOffers,
  }
}
