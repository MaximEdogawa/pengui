'use client'

import { calculateOfferState } from '../lib/dexieUtils'
import { useOfferInspection } from './useOfferInspection'
import { useOfferStorage } from './useOfferStorage'
import { useState } from 'react'

/**
 * Hook for uploading offers to Dexie
 */
export function useOfferUpload() {
  const { postOffer } = useOfferInspection()
  const { updateOffer } = useOfferStorage()
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Upload an offer to Dexie and update IndexedDB with Dexie metadata
   */
  const uploadOfferToDexie = async (offerId: string, offerString: string) => {
    setIsUploading(true)
    setError(null)

    try {
      // Step 1: Upload offer to Dexie
      const uploadResult = await postOffer({
        offer: offerString,
        drop_only: false,
        claim_rewards: false,
      })

      if (!uploadResult || !uploadResult.success) {
        throw new Error('Failed to upload offer to Dexie - no success response')
      }

      // Step 2: Extract offer data from the response
      const dexieOfferId = uploadResult.id
      const dexieOfferData = uploadResult.offer

      if (!dexieOfferId || !dexieOfferData) {
        throw new Error('Upload successful but no offer ID or data returned')
      }

      // Step 3: Calculate state from the offer data
      const calculatedState = calculateOfferState(dexieOfferData)

      // Step 4: Update the offer in IndexedDB with Dexie information
      await updateOffer(offerId, {
        dexieOfferId: dexieOfferId,
        dexieStatus: calculatedState,
        uploadedToDexie: true,
        // Store additional Dexie data for future reference
        dexieOfferData: dexieOfferData,
      })

      return {
        success: true,
        dexieId: dexieOfferId,
        dexieStatus: calculatedState,
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMsg)
      throw err
    } finally {
      setIsUploading(false)
    }
  }

  return {
    uploadOfferToDexie,
    isUploading,
    error,
  }
}
