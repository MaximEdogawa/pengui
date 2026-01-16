import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/shared/ui'
import type { OrderBookOrder } from '../../../../lib/orderBookTypes'

interface FormActionButtonsProps {
  mode: 'modal' | 'inline'
  order?: OrderBookOrder
  onClose?: () => void
  onOpenModal?: () => void
  isSubmitting: boolean
  isUploadingToDexie: boolean
  isFormValid: boolean
  orderType: 'buy' | 'sell' | null
}

/**
 * Extract form action buttons to reduce complexity
 */
export function FormActionButtons({
  mode,
  order,
  onClose,
  onOpenModal,
  isSubmitting,
  isUploadingToDexie,
  isFormValid,
  orderType,
}: FormActionButtonsProps) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {mode === 'modal' && onClose && (
        <Button type="button" onClick={onClose} variant="secondary" disabled={isSubmitting}>
          Cancel
        </Button>
      )}
      {mode === 'inline' && order && onOpenModal && (
        <Button type="button" onClick={onOpenModal} variant="secondary" disabled={isSubmitting}>
          Create New Offer
        </Button>
      )}
      <Button
        type="submit"
        disabled={!isFormValid || isSubmitting || isUploadingToDexie}
        variant={orderType === 'sell' ? 'danger' : 'success'}
        icon={isSubmitting || isUploadingToDexie ? undefined : Plus}
      >
        {isSubmitting || isUploadingToDexie ? (
          <span className="flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin" />
            {isUploadingToDexie ? 'Uploading...' : 'Creating...'}
          </span>
        ) : (
          'Create Offer'
        )}
      </Button>
    </div>
  )
}
