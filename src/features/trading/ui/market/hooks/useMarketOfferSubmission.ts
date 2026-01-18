'use client'

import { type OfferAsset, type OfferDetails } from '@/entities/offer'
import { useTakeOffer } from '@/features/wallet'
import { useCallback } from 'react'

interface UseMarketOfferSubmissionProps {
  formState: {
    offerString: string
    fee: number
    setErrorMessage: (msg: string) => void
    setSuccessMessage: (msg: string) => void
    setIsSubmitting: (value: boolean) => void
    resetForm: () => void
  }
  isFormValid: boolean
  offerPreview: {
    assetsOffered?: OfferAsset[]
    assetsRequested?: OfferAsset[]
    fee?: number
    creatorAddress?: string
  } | null
  onOfferTaken?: (offer: OfferDetails) => void
  onClose?: () => void
  mode?: 'modal' | 'inline'
}

export function useMarketOfferSubmission({
  formState,
  isFormValid,
  offerPreview,
  onOfferTaken,
  onClose,
  mode,
}: UseMarketOfferSubmissionProps) {
  const takeOfferMutation = useTakeOffer()

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      formState.setErrorMessage('')
      formState.setSuccessMessage('')

      if (!isFormValid) {
        formState.setErrorMessage('Please enter a valid offer string and fee')
        return
      }

      formState.setIsSubmitting(true)

      try {
        const result = await takeOfferMutation.mutateAsync({
          offer: formState.offerString.trim(),
          fee: formState.fee,
        })

        if (result && result.success && result.tradeId) {
          const takenOffer: OfferDetails = {
            id: Date.now().toString(),
            tradeId: result.tradeId,
            offerString: formState.offerString.trim(),
            status: 'pending',
            createdAt: new Date(),
            assetsOffered: offerPreview?.assetsOffered || [],
            assetsRequested: offerPreview?.assetsRequested || [],
            fee: offerPreview?.fee || formState.fee,
            creatorAddress: offerPreview?.creatorAddress || 'unknown',
          }

          formState.setSuccessMessage('Offer taken successfully!')
          onOfferTaken?.(takenOffer)

          setTimeout(() => {
            formState.resetForm()
            if (mode === 'modal' && onClose) {
              onClose()
            }
          }, 1500)
        } else {
          throw new Error('Failed to take market offer')
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred'
        formState.setErrorMessage(`Failed to take market offer: ${errorMsg}`)
      } finally {
        formState.setIsSubmitting(false)
      }
    },
    [formState, isFormValid, takeOfferMutation, offerPreview, onOfferTaken, onClose, mode]
  )

  return { handleSubmit }
}
