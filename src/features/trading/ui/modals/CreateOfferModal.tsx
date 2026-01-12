'use client'

import type { OfferDetails } from '@/entities/offer'
import Modal from '@/shared/ui/Modal'
import { X } from 'lucide-react'
import { useThemeClasses } from '@/shared/hooks'
import type { OrderBookFilters, OrderBookOrder } from '../../lib/orderBookTypes'
import CreateOfferForm from '../make-offer/CreateOfferForm'

interface CreateOfferModalProps {
  onClose: () => void
  onOfferCreated: (offer: OfferDetails) => void
  initialOrder?: OrderBookOrder
  initialPriceAdjustments?: { requested: number; offered: number }
  filters?: OrderBookFilters
}

export default function CreateOfferModal({
  onClose,
  onOfferCreated,
  initialOrder,
  initialPriceAdjustments,
  filters,
}: CreateOfferModalProps) {
  const { t } = useThemeClasses()

  return (
    <Modal onClose={onClose} maxWidth="max-w-5xl">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-semibold ${t.text}`}>Create Offer</h2>
          <button
            onClick={onClose}
            className={`${t.textSecondary} hover:${t.text} transition-colors`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Create Offer Form Content */}
        <CreateOfferForm
          order={initialOrder}
          onOfferCreated={onOfferCreated}
          onClose={onClose}
          mode="modal"
          initialPriceAdjustments={initialPriceAdjustments}
          filters={filters}
        />
      </div>
    </Modal>
  )
}
