'use client'

import { Loader2, X } from 'lucide-react'
import type { OfferDetails } from '@/entities/offer'
import Button from '@/shared/ui/Button'
import Modal from '@/shared/ui/Modal'
import type { ThemeClasses } from '@/shared/lib/theme'

interface CancelOfferConfirmationProps {
  offer: OfferDetails
  isCancelling: boolean
  cancelError: string
  onConfirm: () => void
  onCancel: () => void
  t: ThemeClasses
}

export function CancelOfferConfirmation({
  offer,
  isCancelling,
  cancelError,
  onConfirm,
  onCancel,
  t,
}: CancelOfferConfirmationProps) {
  return (
    <Modal onClose={onCancel} maxWidth="max-w-md" closeOnOverlayClick={false}>
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
          <Button onClick={onCancel} variant="secondary">
            Keep Offer
          </Button>
          <Button
            onClick={onConfirm}
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
  )
}
