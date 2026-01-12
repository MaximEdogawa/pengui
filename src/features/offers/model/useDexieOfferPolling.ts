'use client'

import { useDexieDataService } from '../api/useDexieDataService'
import { useOfferStorage } from './useOfferStorage'
import type { DexiePostOfferResponse } from '../lib/dexieTypes'
import { calculateOfferState } from '../lib/dexieUtils'
import { logger } from '@/shared/lib/logger'
import type { OfferDetails } from '@/entities/offer'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef } from 'react'

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
      if (!result.success || !result.offer) return

      // Extract date fields from Dexie offer (needed for both updateKey and needsUpdate check)
      const dateFound = result.offer.date_found
      const dateCompleted = result.offer.date_completed
      const datePending = result.offer.date_pending
      const dateExpiry = result.offer.date_expiry
      const blockExpiry = result.offer.block_expiry
      const spentBlockIndex = result.offer.spent_block_index
      const knownTaker = result.offer.known_taker

      // Create a unique key for this update to prevent duplicate processing
      // Must include ALL fields that are checked in needsUpdate and updated in the database
      // This ensures changes to any tracked field (date_expiry, block_expiry, spent_block_index, known_taker)
      // are properly detected and not short-circuited by processedUpdatesRef
      const updateKey = `${offerId}-${dateFound || ''}-${dateCompleted || ''}-${datePending || ''}-${dateExpiry || ''}-${blockExpiry || ''}-${spentBlockIndex || ''}-${knownTaker !== null && knownTaker !== undefined ? String(knownTaker) : ''}`

      // Skip if we've already processed this exact update
      if (processedUpdatesRef.current.has(updateKey)) {
        return
      }

      // Get current offer from the ref to avoid dependency on offers array
      const currentOffer = offersRef.current.find((o) => o.id === offerId)
      if (!currentOffer) return

      // Calculate the offer state from date fields
      const calculatedState = calculateOfferState(result.offer)

      // Map calculated state to legacy status
      let newStatus = currentOffer.status
      if (calculatedState === 'Completed') {
        newStatus = 'completed'
      } else if (calculatedState === 'Cancelled' || calculatedState === 'Expired') {
        newStatus = 'cancelled'
      } else if (calculatedState === 'Pending') {
        newStatus = 'pending'
      } else if (calculatedState === 'Open') {
        newStatus = 'active'
      }

      // Check if we need to update (compare state or date fields)
      const currentState = currentOffer.dexieStatus || currentOffer.state
      const needsUpdate =
        currentState !== calculatedState ||
        currentOffer.datePending !== datePending ||
        currentOffer.dateCompleted !== dateCompleted ||
        currentOffer.dateFound !== dateFound ||
        currentOffer.dateExpiry !== dateExpiry

      if (needsUpdate) {
        // Mark this update as processed
        processedUpdatesRef.current.add(updateKey)

        // Clean up old processed updates (keep only last 100 to prevent memory leak)
        if (processedUpdatesRef.current.size > 100) {
          const entries = Array.from(processedUpdatesRef.current)
          processedUpdatesRef.current.clear()
          entries.slice(-50).forEach((key) => processedUpdatesRef.current.add(key))
        }

        // Update in IndexedDB with all date fields and calculated state
        await offerStorage.updateOffer(offerId, {
          dexieOfferData: result.offer,
          dexieStatus: calculatedState,
          state: calculatedState,
          status: newStatus,
          dateFound,
          dateCompleted: dateCompleted || undefined,
          datePending: datePending || undefined,
          dateExpiry: dateExpiry || undefined,
          blockExpiry: blockExpiry || undefined,
          spentBlockIndex: spentBlockIndex || undefined,
          knownTaker,
        })

        // Trigger a refresh event so the UI updates
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('offer-status-updated', { detail: { offerId } }))
        }
      }
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
