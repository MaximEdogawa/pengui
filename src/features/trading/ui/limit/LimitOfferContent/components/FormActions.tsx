import { Button } from '@/shared/ui'
import { Loader2, Plus } from 'lucide-react'

interface FormActionsProps {
  mode: 'modal' | 'inline'
  onClose?: () => void
  isSubmitting: boolean
  isUploadingToDexie: boolean
  isFormValid: boolean
}

export function FormActions({
  mode,
  onClose,
  isSubmitting,
  isUploadingToDexie,
  isFormValid,
}: FormActionsProps) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {mode === 'modal' && onClose && (
        <Button type="button" onClick={onClose} variant="secondary" disabled={isSubmitting}>
          Cancel
        </Button>
      )}
      <Button
        type="submit"
        disabled={!isFormValid || isSubmitting || isUploadingToDexie}
        variant="success"
        icon={isSubmitting ? undefined : Plus}
      >
        {isSubmitting || isUploadingToDexie ? (
          <>
            <Loader2 size={12} className="animate-spin" />
            {isUploadingToDexie ? 'Uploading...' : 'Creating...'}
          </>
        ) : (
          'Create Offer'
        )}
      </Button>
    </div>
  )
}
