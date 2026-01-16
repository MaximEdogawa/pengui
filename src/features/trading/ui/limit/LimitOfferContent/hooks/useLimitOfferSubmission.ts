import { useCallback, useState } from 'react'
import { toWalletAssets } from '@/entities/asset'
import type { OfferDetails } from '@/entities/offer'
import { useOfferStorage } from '@/features/offers/model/useOfferStorage'
import { useOfferUpload } from '@/features/offers/model/useOfferUpload'
import { useCreateOffer, useWalletAddress } from '@/features/wallet'
import { logger } from '@/shared/lib/logger'
import { convertToSmallestUnit, getMinimumFeeInXch } from '@/shared/lib/utils/chia-units'
import { useQueryClient } from '@tanstack/react-query'
import type { ExtendedAsset as ExtendedOfferAsset } from '@/shared/ui'
import { useOrderBook } from '../../../../model/useOrderBook'

interface UseLimitOfferSubmissionProps {
  extendedMakerAssets: ExtendedOfferAsset[]
  extendedTakerAssets: ExtendedOfferAsset[]
  fee: number
  isFormValid: boolean
  onOfferCreated?: (offer: OfferDetails) => void
  resetForm: () => void
  mode: 'modal' | 'inline'
  onClose?: () => void
  setRequestedAdjustment: (val: number) => void
  setOfferedAdjustment: (val: number) => void
  setFee: (val: number) => void
  setFeeInput: (val: string | undefined) => void
}

export function useLimitOfferSubmission({
  extendedMakerAssets,
  extendedTakerAssets,
  fee,
  isFormValid,
  onOfferCreated,
  resetForm,
  mode,
  onClose,
  setRequestedAdjustment,
  setOfferedAdjustment,
  setFee,
  setFeeInput,
}: UseLimitOfferSubmissionProps) {
  const createOfferMutation = useCreateOffer()
  const offerStorage = useOfferStorage()
  const { uploadOfferToDexie, isUploading: isUploadingToDexie } = useOfferUpload()
  const { data: walletAddress } = useWalletAddress()
  const queryClient = useQueryClient()
  const { refreshOrderBook } = useOrderBook()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setErrorMessage('')
      setSuccessMessage('')

      if (!isFormValid) {
        setErrorMessage('Please fill in all required fields')
        return
      }

      setIsSubmitting(true)

      try {
        const offerAssets = toWalletAssets(
          extendedMakerAssets.map((asset) => ({ ...asset, amount: Number(asset.amount) || 0 })),
          convertToSmallestUnit
        )

        const requestAssets = toWalletAssets(
          extendedTakerAssets.map((asset) => ({ ...asset, amount: Number(asset.amount) || 0 })),
          convertToSmallestUnit
        )

        const result = await createOfferMutation.mutateAsync({
          walletId: 1,
          offerAssets,
          requestAssets,
          fee: convertToSmallestUnit(Number(fee) || 0, 'xch'),
        })

        if (!result || !result.offer) {
          throw new Error('Wallet did not return a valid offer string')
        }

        const newOffer: OfferDetails = {
          id: result?.id || Date.now().toString(),
          tradeId: result?.tradeId || result?.id || 'unknown',
          offerString: result?.offer || '',
          status: 'active',
          createdAt: new Date(),
          assetsOffered: extendedMakerAssets.map((asset) => ({
            assetId: asset.assetId || '',
            amount: Number(asset.amount) || 0,
            type: asset.type,
            symbol: asset.symbol || asset.type.toUpperCase(),
          })),
          assetsRequested: extendedTakerAssets.map((asset) => ({
            assetId: asset.assetId || '',
            amount: Number(asset.amount) || 0,
            type: asset.type,
            symbol: asset.symbol || asset.type.toUpperCase(),
          })),
          fee: Number(fee) || 0,
          creatorAddress: walletAddress?.address || 'unknown',
        }

        await offerStorage.saveOffer(newOffer, true)

        try {
          await uploadOfferToDexie(newOffer.id, newOffer.offerString)
        } catch (uploadError) {
          logger.error('Failed to upload to Dexie:', uploadError)
        }

        refreshOrderBook()
        queryClient.invalidateQueries({ queryKey: ['orderBook'] })

        setSuccessMessage('Offer created successfully!')
        onOfferCreated?.(newOffer)

        setTimeout(() => {
          resetForm()
          setRequestedAdjustment(0)
          setOfferedAdjustment(0)
          setFee(getMinimumFeeInXch())
          setFeeInput(undefined)
          setSuccessMessage('')
          if (mode === 'modal' && onClose) {
            onClose()
          }
        }, 1500)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred'
        setErrorMessage(`Failed to create offer: ${errorMsg}`)
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      isFormValid,
      extendedMakerAssets,
      extendedTakerAssets,
      fee,
      createOfferMutation,
      offerStorage,
      walletAddress,
      uploadOfferToDexie,
      refreshOrderBook,
      queryClient,
      onOfferCreated,
      resetForm,
      mode,
      onClose,
      setRequestedAdjustment,
      setOfferedAdjustment,
      setFee,
      setFeeInput,
    ]
  )

  return {
    handleSubmit,
    isSubmitting,
    isUploadingToDexie,
    errorMessage,
    successMessage,
  }
}
