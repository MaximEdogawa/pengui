'use client'

import { Ban, Loader2 } from 'lucide-react'
import { Modal } from '@/shared/ui'
import type { ThemeClasses } from '@/shared/lib/theme'

interface CancelAllConfirmationProps {
  isOpen: boolean
  isCancelling: boolean
  error: string | null
  onConfirm: () => void
  onClose: () => void
  t: ThemeClasses
}

export function CancelAllConfirmation({
  isOpen,
  isCancelling,
  error,
  onConfirm,
  onClose,
  t,
}: CancelAllConfirmationProps) {
  if (!isOpen) return null

  return (
    <Modal onClose={onClose} maxWidth="max-w-md" closeOnOverlayClick={false}>
      <div className="p-6">
        <h3 className={`text-lg font-semibold ${t.text} mb-2`}>Cancel All Active Offers</h3>
        <p className={`${t.textSecondary} mb-4`}>
          Are you sure you want to cancel all active offers? This action cannot be undone.
        </p>
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg border ${t.border} ${t.text} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
          >
            Keep Offers
          </button>
          <button
            onClick={onConfirm}
            disabled={isCancelling}
            className={`px-4 py-2 rounded-lg border border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors`}
          >
            {isCancelling ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Cancelling...
              </>
            ) : (
              <>
                <Ban size={14} />
                Cancel All Offers
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}
