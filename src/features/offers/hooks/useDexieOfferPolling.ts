'use client'

import { useDexieDataService } from '../api/useDexieDataService'
import { useOfferStorage } from './useOfferStorage'
import type { DexiePostOfferResponse } from '../lib/dexieTypes'
import { logger } from '@/shared/lib/logger'
import type { OfferDetails } from '@/entities/offer'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef } from 'react'
import { processOfferUpdate } from '../lib/offerPollingUtils'

const POLLING_INTERVAL = 30000 // 30 seconds

/**
 * Hook to poll Dexie offer status for offers on the current page
 * Only polls offers that are uploaded to Dexie and have a dexieOfferId
 */
export function useDexieOfferPolling(offers: OfferDetails[]) {
  const dexieDataService = useDexieDataService()
  const offerStorage = useOfferStorage()

  // Filter offers that need polling (uploaded to Dexie and have dexieOfferId)
  const offersToPoll = useMemo(() => {
    return offers.filter(
      (offer) =>
        offer.uploadedToDexie &&
        offer.dexieOfferId &&
        // Only poll offers that are still active/pending (not completed/cancelled/expired)
        ['pending', 'active'].includes(offer.status)
    )
  }, [offers])

  // Poll each offer's status
  const pollResults = useQuery({
    queryKey: ['dexie-offer-polling', offersToPoll.map((o) => o.dexieOfferId).filter(Boolean)],
    queryFn: async () => {
      const results = await Promise.allSettled(
        offersToPoll.map(async (offer) => {
          if (!offer.dexieOfferId) return null

          try {
            const result = await dexieDataService.inspectOffer(offer.dexieOfferId)
            return {
              offerId: offer.id,
              dexieOfferId: offer.dexieOfferId,
              result,
            }
          } catch (error) {
            logger.error(`Failed to poll offer ${offer.dexieOfferId}:`, error)
            return null
          }
        })
      )

      return results
        .filter(
          (
            r
          ): r is PromiseFulfilledResult<{
            offerId: string
            dexieOfferId: string
            result: DexiePostOfferResponse
          }> => r.status === 'fulfilled' && r.value !== null
        )
        .map((r) => r.value)
    },
    enabled: offersToPoll.length > 0,
    refetchInterval: POLLING_INTERVAL,
    refetchIntervalInBackground: false, // Only poll when tab is active
  })

  // Update offers in IndexedDB when status changes
  // Use a ref to track which offers we've already processed to prevent duplicate updates
  const processedUpdatesRef = useRef<Set<string>>(new Set())
  // Use a ref to store the latest offers to avoid dependency issues
  const offersRef = useRef<OfferDetails[]>(offers)

  // Keep the ref in sync with the offers prop
  useEffect(() => {
    offersRef.current = offers
  }, [offers])

  useEffect(() => {
    if (!pollResults.data || pollResults.data.length === 0) return

    const updatePromises = pollResults.data.map(async ({ offerId, result }) => {
      // Get current offer from the ref to avoid dependency on offers array
      const currentOffer = offersRef.current.find((o) => o.id === offerId)

      await processOfferUpdate({
        offerId,
        result,
        currentOffer,
        processedUpdatesRef,
        updateOffer: offerStorage.updateOffer.bind(offerStorage),
      })
    })

    Promise.allSettled(updatePromises).catch((error) => {
      logger.error('Failed to update offers from polling:', error)
    })
  }, [pollResults.data, offerStorage]) // Removed 'offers' from dependencies to prevent loop

  return {
    isPolling: pollResults.isFetching,
    polledCount: offersToPoll.length,
  }
}
