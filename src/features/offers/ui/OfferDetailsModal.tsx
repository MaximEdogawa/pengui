'use client'

import type { OfferDetails } from '@/entities/offer'
import { useThemeClasses } from '@/shared/hooks'
import { useCatTokens } from '@/entities/asset'
import { Modal } from '@/shared/ui'
import { useMyOffers } from '../model'
import { useOfferDetailsActions } from './OfferDetailsModal/hooks/useOfferDetailsActions'
import { OfferDetailsHeader } from './OfferDetailsModal/components/OfferDetailsHeader'
import { OfferDetailsContent } from './OfferDetailsModal/components/OfferDetailsContent'
import { OfferActions } from './OfferDetailsModal/components/OfferActions'
import { CancelOfferConfirmation } from './OfferDetailsModal/components/CancelOfferConfirmation'
import { DeleteOfferConfirmation } from './OfferDetailsModal/components/DeleteOfferConfirmation'

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
  const { getCatTokenInfo } = useCatTokens()
  const { getStatusClass, formatDate } = useMyOffers()

  const actions = useOfferDetailsActions({
    offer,
    onOfferCancelled,
    onOfferDeleted,
    onOfferUpdated,
    onClose,
  })

  const getTickerSymbol = (assetId: string): string => {
      const tokenInfo = getCatTokenInfo(assetId)
      return tokenInfo.ticker
  }

  const dexieUrl = offer.dexieOfferId
    ? `https://testnet.dexie.space/offers/${offer.dexieOfferId}`
    : null

  return (
    <>
      <Modal onClose={onClose} maxWidth="max-w-2xl">
        <div className="p-4">
          <OfferDetailsHeader onClose={onClose} t={t} />
          <OfferDetailsContent
            offer={offer}
            getStatusClass={getStatusClass}
            formatDate={formatDate}
            getTickerSymbol={getTickerSymbol}
            isCopied={actions.isCopied}
            uploadError={actions.uploadError}
            validationError={actions.validationError}
            stateValidationError={actions.stateValidationError}
            dexieUrl={dexieUrl}
            onCopyOfferString={actions.copyOfferString}
            onCopyOfferId={actions.copyOfferId}
            t={t}
          />
          <OfferActions
            offer={offer}
            isCancelling={actions.isCancelling}
            isDeleting={actions.isDeleting}
            isValidating={actions.isValidating}
            isStateValidating={actions.isStateValidating}
            isUploading={actions.isUploading}
            dexieUrl={dexieUrl}
            onClose={onClose}
            onCancelOffer={actions.cancelOffer}
            onDeleteOffer={actions.deleteOffer}
            onUploadToDexie={actions.uploadToDexie}
            onValidateOfferState={actions.handleValidateOfferState}
            onStartStateValidation={actions.handleStartStateValidation}
            onStopStateValidation={actions.handleStopStateValidation}
            t={t}
          />
        </div>
      </Modal>

      {actions.showCancelConfirmation && (
        <CancelOfferConfirmation
          offer={offer}
          isCancelling={actions.isCancelling}
          cancelError={actions.cancelError}
          onConfirm={actions.confirmCancelOffer}
          onCancel={() => actions.setShowCancelConfirmation(false)}
          t={t}
        />
      )}

      {actions.showDeleteConfirmation && (
        <DeleteOfferConfirmation
          offer={offer}
          isDeleting={actions.isDeleting}
          deleteError={actions.deleteError}
          onConfirm={actions.confirmDeleteOffer}
          onCancel={() => actions.setShowDeleteConfirmation(false)}
          t={t}
        />
      )}
    </>
  )
}
