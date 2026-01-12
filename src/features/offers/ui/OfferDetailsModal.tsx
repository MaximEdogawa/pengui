'use client'

import type { OfferDetails } from '@/entities/offer'
import { convertOfferStateToStatus } from '@/entities/offer'
import { useCancelOffer } from '@/features/wallet'
import { useCatTokens, useThemeClasses } from '@/shared/hooks'
import { formatAssetAmount, getMinimumFeeInXch } from '@/shared/lib/utils/chia-units'
import { getDexieStatusDescription } from '@/shared/lib/utils/offerUtils'
import Button from '@/shared/ui/Button'
import Modal from '@/shared/ui/Modal'
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Play,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { calculateOfferState } from '../lib/dexieUtils'
import { useMyOffers, useOfferInspection, useOfferStorage, useOfferUpload } from '../model'

interface OfferDetailsModalProps {
  offer: OfferDetails
  onClose: () => void
  onOfferCancelled: (offer: OfferDetails) => void
  onOfferDeleted: (offer: OfferDetails) => void
  onOfferUpdated: (offer: OfferDetails) => void
}

export default function OfferDetailsModal({
  offer,
  onClose,
  onOfferCancelled,
  onOfferDeleted,
  onOfferUpdated,
}: OfferDetailsModalProps) {
  const { t } = useThemeClasses()
  const cancelOfferMutation = useCancelOffer()
  const offerStorage = useOfferStorage()
  const { uploadOfferToDexie, isUploading } = useOfferUpload()
  const { inspectOffer } = useOfferInspection()
  const { getCatTokenInfo } = useCatTokens()
  const { getStatusClass, formatDate } = useMyOffers()

  // State
  const [isCancelling, setIsCancelling] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [isStateValidating, setIsStateValidating] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [validationError, setValidationError] = useState('')
  const [stateValidationError, setStateValidationError] = useState('')

  const validationIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (validationIntervalRef.current) {
        clearInterval(validationIntervalRef.current)
      }
    }
  }, [])

  const copyOfferString = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(offer.offerString)
      setIsCopied(true)
      setTimeout(() => {
        setIsCopied(false)
      }, 2000)
    } catch {
      // Failed to copy
    }
  }, [offer.offerString])

  const copyOfferId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(offer.tradeId)
      setIsCopied(true)
      setTimeout(() => {
        setIsCopied(false)
      }, 2000)
    } catch {
      // Failed to copy
    }
  }, [offer.tradeId])

  const cancelOffer = useCallback(() => {
    setShowCancelConfirmation(true)
  }, [])

  const confirmCancelOffer = useCallback(async () => {
    setIsCancelling(true)
    setCancelError('')

    try {
      // Use minimum fee if offer fee is not set
      const fee = offer.fee ?? getMinimumFeeInXch()

      await cancelOfferMutation.mutateAsync({
        id: offer.tradeId,
        fee: fee,
      })

      // Update the offer status in IndexedDB
      await offerStorage.updateOffer(offer.id, { status: 'cancelled' })

      const updatedOffer = { ...offer, status: 'cancelled' as const }
      await onOfferCancelled(updatedOffer)
      setShowCancelConfirmation(false)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred'
      setCancelError(`Failed to cancel offer: ${errorMsg}`)
    } finally {
      setIsCancelling(false)
    }
  }, [offer, cancelOfferMutation, offerStorage, onOfferCancelled])

  const deleteOffer = useCallback(() => {
    setShowDeleteConfirmation(true)
  }, [])

  const confirmDeleteOffer = useCallback(async () => {
    setIsDeleting(true)
    setDeleteError('')

    try {
      // Delete from IndexedDB storage
      await offerStorage.deleteOffer(offer.id)

      // Emit the delete event to update the parent component and refresh from storage
      await onOfferDeleted(offer)
      setShowDeleteConfirmation(false)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred'
      setDeleteError(`Failed to delete offer: ${errorMsg}`)
    } finally {
      setIsDeleting(false)
    }
  }, [offer, offerStorage, onOfferDeleted])

  const uploadToDexie = useCallback(async () => {
    if (!offer.offerString) {
      setUploadError('No offer string available to upload')
      return
    }

    setUploadError('')

    try {
      const result = await uploadOfferToDexie(offer.id, offer.offerString)

      // Emit event to update parent component
      const updatedOffer = {
        ...offer,
        dexieOfferId: result.dexieId,
        dexieStatus: result.dexieStatus,
        uploadedToDexie: true,
      }
      await onOfferUpdated(updatedOffer)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred'
      setUploadError(`Failed to upload to Dexie: ${errorMsg}`)
    }
  }, [offer, uploadOfferToDexie, onOfferUpdated])

  const handleValidateOfferState = useCallback(async () => {
    if (!offer.dexieOfferId) {
      setValidationError('No Dexie offer ID available for validation')
      return
    }

    setIsValidating(true)
    setValidationError('')

    try {
      const result = await inspectOffer(offer.dexieOfferId)

      if (result && result.success && result.offer) {
        // Calculate state from date fields instead of using status field
        const calculatedState = calculateOfferState(result.offer)
        const convertedStatus = convertOfferStateToStatus(calculatedState)

        try {
          // Update the offer with the latest Dexie status and full offer data
          await offerStorage.updateOffer(offer.id, {
            dexieStatus: calculatedState,
            status: convertedStatus,
            dexieOfferData: result.offer, // Store full Dexie data for future reference
          })

          // Emit event to update parent component and refresh from storage
          const updatedOffer = {
            ...offer,
            dexieStatus: calculatedState,
            status: convertedStatus,
            dexieOfferData: result.offer,
          }
          await onOfferUpdated(updatedOffer)
        } catch (updateError) {
          // Handle case where offer was deleted from storage
          if (
            updateError instanceof Error &&
            updateError.message.includes('No offer found with ID')
          ) {
            setValidationError('This offer has been deleted. Closing modal...')
            // Notify parent that offer was deleted (this will close the modal)
            await onOfferDeleted(offer)
            // Also close the modal directly as a fallback
            onClose()
          } else {
            throw updateError
          }
        }
      } else {
        setValidationError('Failed to validate offer state')
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred'
      setValidationError(`Failed to validate offer: ${errorMsg}`)
    } finally {
      setIsValidating(false)
    }
  }, [offer, inspectOffer, offerStorage, onOfferUpdated, onOfferDeleted, onClose])

  const handleStartStateValidation = useCallback(() => {
    if (!offer.dexieOfferId) {
      setStateValidationError('No Dexie offer ID available for validation')
      return
    }

    setIsStateValidating(true)
    setStateValidationError('')

    // Initial fetch
    handleValidateOfferState()

    // Set up interval for continuous validation
    validationIntervalRef.current = setInterval(() => {
      handleValidateOfferState()
    }, 30000) // 30 seconds
  }, [offer.dexieOfferId, handleValidateOfferState])

  const handleStopStateValidation = useCallback(() => {
    if (validationIntervalRef.current) {
      clearInterval(validationIntervalRef.current)
      validationIntervalRef.current = null
    }
    setIsStateValidating(false)
  }, [])

  const getTickerSymbol = useCallback(
    (assetId: string): string => {
      const tokenInfo = getCatTokenInfo(assetId)
      return tokenInfo.ticker
    },
    [getCatTokenInfo]
  )

  const dexieUrl = offer.dexieOfferId
    ? `https://testnet.dexie.space/offers/${offer.dexieOfferId}`
    : null

  return (
    <>
      <Modal onClose={onClose} maxWidth="max-w-2xl">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h2 className={`text-lg font-semibold ${t.text}`}>Offer Details</h2>
            <button onClick={onClose} className={`${t.textSecondary} hover:${t.text}`}>
              <X size={18} />
            </button>
          </div>

          <div className="space-y-3">
            {/* Status and Trade ID */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusClass(
                    offer.status
                  )}`}
                >
                  {offer.status.toUpperCase()}
                </span>
                {offer.uploadedToDexie &&
                  offer.dexieStatus !== undefined &&
                  offer.dexieStatus !== null && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                      Dexie: {getDexieStatusDescription(offer.dexieStatus)}
                    </span>
                  )}
              </div>
              <div className="flex flex-col sm:items-end">
                <p className={`text-xs ${t.textSecondary} mb-0.5`}>Offer ID</p>
                <button
                  onClick={copyOfferId}
                  className={`text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-2 py-0.5 rounded font-mono transition-all duration-300 cursor-pointer group relative overflow-hidden max-w-[200px] sm:max-w-[250px] ${
                    isCopied
                      ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                      : ''
                  }`}
                  title={isCopied ? 'Copied!' : 'Click to copy offer ID'}
                >
                  <span className="transition-all duration-300 truncate block">
                    {offer.tradeId?.slice(0, 12) || 'Unknown'}...
                  </span>
                </button>
              </div>
            </div>

            {/* Assets Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Assets Offered */}
              <div>
                <h3 className={`text-base font-medium ${t.text} mb-2`}>
                  Assets Offered ({(offer.assetsOffered || []).length})
                </h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {(offer.assetsOffered || []).map((asset, index) => (
                    <div
                      key={`offered-${index}`}
                      className={`flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className={`font-medium ${t.text} text-base`}>
                            {formatAssetAmount(asset.amount, asset.type)}
                          </span>
                          <span className={`text-xs font-medium ${t.textSecondary}`}>
                            {asset.assetId
                              ? getTickerSymbol(asset.assetId)
                              : asset.symbol || asset.type.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                          {asset.type.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assets Requested */}
              <div>
                <h3 className={`text-base font-medium ${t.text} mb-2`}>
                  Assets Requested ({(offer.assetsRequested || []).length})
                </h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {(offer.assetsRequested || []).map((asset, index) => (
                    <div
                      key={`requested-${index}`}
                      className={`flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className={`font-medium ${t.text} text-base`}>
                            {formatAssetAmount(asset.amount, asset.type)}
                          </span>
                          <span className={`text-xs font-medium ${t.textSecondary}`}>
                            {asset.assetId
                              ? getTickerSymbol(asset.assetId)
                              : asset.symbol || asset.type.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                          {asset.type.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Offer String */}
            <div>
              <h3 className={`text-base font-medium ${t.text} mb-2`}>Offer String</h3>
              <div className="relative">
                <textarea
                  value={offer.offerString}
                  readOnly
                  rows={3}
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 ${t.text} text-xs font-mono resize-none`}
                />
                <button
                  onClick={copyOfferString}
                  className={`absolute top-2 right-2 p-2 ${t.textSecondary} hover:${t.text}`}
                  title={isCopied ? 'Copied!' : 'Copy offer string'}
                >
                  {isCopied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            {/* Offer Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <h4 className={`text-xs font-medium ${t.textSecondary} mb-1`}>Transaction Fee</h4>
                <p className={`text-base font-semibold ${t.text}`}>{offer.fee || 0} XCH</p>
              </div>
              <div>
                <h4 className={`text-xs font-medium ${t.textSecondary} mb-1`}>Created</h4>
                <p className={`text-xs ${t.text}`}>{formatDate(offer.createdAt)}</p>
              </div>
              <div>
                <h4 className={`text-xs font-medium ${t.textSecondary} mb-1`}>Creator Address</h4>
                <p className={`text-xs ${t.text} font-mono break-all`}>
                  {offer.creatorAddress || 'Unknown'}
                </p>
              </div>
              {offer.expiresAt && (
                <div>
                  <h4 className={`text-xs font-medium ${t.textSecondary} mb-1`}>Expires</h4>
                  <p className={`text-xs ${t.text}`}>{formatDate(offer.expiresAt)}</p>
                </div>
              )}
            </div>

            {/* Upload Success Display */}
            {offer.dexieOfferId && (
              <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                <div className="flex items-start">
                  <Check className="text-green-500 mr-2 mt-0.5" size={16} />
                  <div className="flex-1">
                    <h4 className="text-xs font-medium text-green-800 dark:text-green-300 mb-1">
                      ✅ Successfully uploaded to Dexie!
                    </h4>
                    <p className="text-xs text-green-700 dark:text-green-300 mb-2">
                      Your offer is now live on the Dexie marketplace and can be discovered by other
                      traders.
                    </p>
                    {dexieUrl && (
                      <a
                        href={dexieUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex"
                      >
                        <Button
                          variant="success"
                          icon={ExternalLink}
                          size="sm"
                          className="pointer-events-none"
                        >
                          View on Dexie.space
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Error Displays */}
            {uploadError && (
              <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <div className="flex items-center">
                  <span className="text-xs text-red-700 dark:text-red-300">{uploadError}</span>
                </div>
              </div>
            )}

            {validationError && (
              <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <div className="flex items-center">
                  <span className="text-xs text-red-700 dark:text-red-300">{validationError}</span>
                </div>
              </div>
            )}

            {stateValidationError && (
              <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <div className="flex items-center">
                  <span className="text-xs text-red-700 dark:text-red-300">
                    {stateValidationError}
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className={`flex flex-wrap justify-end gap-2 pt-3 border-t ${t.border}`}>
              <Button onClick={onClose} variant="secondary">
                Close
              </Button>
              <Button
                onClick={deleteOffer}
                disabled={isDeleting}
                variant="secondary"
                icon={isDeleting ? undefined : Trash2}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </Button>
              {offer.status === 'active' && (
                <Button
                  onClick={cancelOffer}
                  disabled={isCancelling}
                  variant="danger"
                  icon={isCancelling ? undefined : X}
                >
                  {isCancelling ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    'Cancel'
                  )}
                </Button>
              )}
              {/* Show upload button if no Dexie ID */}
              {!offer.dexieOfferId && offer.offerString && (
                <Button
                  onClick={uploadToDexie}
                  disabled={isUploading}
                  variant="info"
                  icon={isUploading ? undefined : Upload}
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Upload to Dexie'
                  )}
                </Button>
              )}

              {/* Show Dexie actions if ID exists */}
              {offer.dexieOfferId && (
                <>
                  <Button
                    onClick={handleValidateOfferState}
                    disabled={isValidating}
                    variant="info"
                    icon={isValidating ? undefined : RefreshCw}
                  >
                    {isValidating ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        Validating...
                      </>
                    ) : (
                      'Validate State'
                    )}
                  </Button>
                  <Button
                    onClick={
                      isStateValidating ? handleStopStateValidation : handleStartStateValidation
                    }
                    disabled={isValidating}
                    variant="warning"
                    icon={isStateValidating ? undefined : Play}
                  >
                    {isStateValidating ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        Stop Monitoring
                      </>
                    ) : (
                      'Monitor State'
                    )}
                  </Button>
                  {dexieUrl && (
                    <a
                      href={dexieUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex"
                    >
                      <Button
                        variant="success"
                        icon={ExternalLink}
                        type="button"
                        className="pointer-events-none"
                      >
                        View on Dexie
                      </Button>
                    </a>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Confirmation Dialogs */}
      {showCancelConfirmation && (
        <Modal
          onClose={() => setShowCancelConfirmation(false)}
          maxWidth="max-w-md"
          closeOnOverlayClick={false}
        >
          <div className="p-6">
            <h3 className={`text-lg font-semibold ${t.text} mb-2`}>Cancel Offer</h3>
            <p className={`${t.textSecondary} mb-4`}>
              Are you sure you want to cancel this offer? This action cannot be undone.
            </p>
            <p className={`text-xs ${t.textSecondary} mb-4 font-mono break-all`}>
              Offer ID:{' '}
              {offer.tradeId
                ? `${offer.tradeId.slice(0, 12)}...${offer.tradeId.slice(-8)}`
                : 'Unknown'}
            </p>
            {cancelError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-700 dark:text-red-300">{cancelError}</p>
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button onClick={() => setShowCancelConfirmation(false)} variant="secondary">
                Keep Offer
              </Button>
              <Button
                onClick={confirmCancelOffer}
                disabled={isCancelling}
                variant="danger"
                icon={isCancelling ? undefined : X}
              >
                {isCancelling ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Cancel Offer'
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {showDeleteConfirmation && (
        <Modal
          onClose={() => setShowDeleteConfirmation(false)}
          maxWidth="max-w-md"
          closeOnOverlayClick={false}
        >
          <div className="p-6">
            <h3 className={`text-lg font-semibold ${t.text} mb-2`}>Delete Offer</h3>
            <p className={`${t.textSecondary} mb-4`}>
              Are you sure you want to permanently delete this offer? This action cannot be undone
              and the offer will be removed from your list.
            </p>
            <p className={`text-xs ${t.textSecondary} mb-4 font-mono break-all`}>
              Offer ID:{' '}
              {offer.tradeId
                ? `${offer.tradeId.slice(0, 12)}...${offer.tradeId.slice(-8)}`
                : 'Unknown'}
            </p>
            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-700 dark:text-red-300">{deleteError}</p>
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button onClick={() => setShowDeleteConfirmation(false)} variant="secondary">
                Keep Offer
              </Button>
              <Button
                onClick={confirmDeleteOffer}
                disabled={isDeleting}
                variant="danger"
                icon={isDeleting ? undefined : Trash2}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Offer'
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
