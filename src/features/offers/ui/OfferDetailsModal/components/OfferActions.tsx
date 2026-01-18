'use client'

import {
  ExternalLink,
  Loader2,
  Play,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import type { OfferDetails } from '@/entities/offer'
import { Button } from '@/shared/ui'
import type { ThemeClasses } from '@/shared/lib/theme'

interface OfferActionsProps {
  offer: OfferDetails
  isCancelling: boolean
  isDeleting: boolean
  isValidating: boolean
  isStateValidating: boolean
  isUploading: boolean
  dexieUrl: string | null
  onClose: () => void
  onCancelOffer: () => void
  onDeleteOffer: () => void
  onUploadToDexie: () => void
  onValidateOfferState: () => void
  onStartStateValidation: () => void
  onStopStateValidation: () => void
  t: ThemeClasses
}

export function OfferActions({
  offer,
  isCancelling,
  isDeleting,
  isValidating,
  isStateValidating,
  isUploading,
  dexieUrl,
  onClose,
  onCancelOffer,
  onDeleteOffer,
  onUploadToDexie,
  onValidateOfferState,
  onStartStateValidation,
  onStopStateValidation,
  t,
}: OfferActionsProps) {
  return (
    <div className={`flex flex-wrap justify-end gap-2 pt-3 border-t ${t.border}`}>
      <Button onClick={onClose} variant="secondary">
        Close
      </Button>
      <Button
        onClick={onDeleteOffer}
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
          onClick={onCancelOffer}
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
      {!offer.dexieOfferId && offer.offerString && (
        <Button
          onClick={onUploadToDexie}
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
      {offer.dexieOfferId && (
        <>
          <Button
            onClick={onValidateOfferState}
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
            onClick={isStateValidating ? onStopStateValidation : onStartStateValidation}
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
  )
}
