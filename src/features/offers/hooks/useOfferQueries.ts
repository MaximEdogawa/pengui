'use client'

import type { StoredOffer } from '@/shared/lib/database/indexedDB'
import { useNetwork } from '@/shared/hooks/useNetwork'
import { offerStorageService } from '@/shared/lib/services/offerStorageService'
import { useCallback } from 'react'

interface UseOfferQueriesProps {
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setOffers: React.Dispatch<React.SetStateAction<StoredOffer[]>>
}

/**
 * Hook for offer query operations
 */
export function useOfferQueries({ setIsLoading, setError, setOffers }: UseOfferQueriesProps) {
  const { network } = useNetwork()

  /**
   * Get offers by status
   */
  const getOffersByStatus = useCallback(
    async (status: string, walletAddress?: string) => {
      setIsLoading(true)
      setError(null)

      try {
        const statusOffers = await offerStorageService.getOffersByStatus(status, walletAddress, network)
        return statusOffers
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to get offers by status')
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [network, setIsLoading, setError]
  )

  /**
   * Get unsynced offers
   */
  const getUnsyncedOffers = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const unsyncedOffers = await offerStorageService.getUnsyncedOffers(network)
      return unsyncedOffers
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get unsynced offers')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [network, setIsLoading, setError])

  /**
   * Mark offers as synced
   */
  const markOffersAsSynced = useCallback(
    async (offerIds: string[]) => {
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
    },
    [setIsLoading, setError, setOffers]
  )

  /**
   * Get database statistics
   */
  const getStats = useCallback(async () => {
    return await offerStorageService.getStats()
  }, [])

  return {
    getOffersByStatus,
    getUnsyncedOffers,
    markOffersAsSynced,
    getStats,
  }
}
