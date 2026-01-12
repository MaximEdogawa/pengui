import Modal from '@/shared/ui/Modal'
import { X } from 'lucide-react'
import { useThemeClasses } from '@/shared/hooks'
import type { OfferDetails } from '@/entities/offer'
import type { OrderBookOrder } from '../../lib/orderBookTypes'
import MarketOfferTab from '../take-offer/MarketOfferTab'

interface TakeOfferModalProps {
  onClose: () => void
  onOfferTaken?: (offer: OfferDetails) => void
  order?: OrderBookOrder
}

export default function TakeOfferModal({ onClose, onOfferTaken, order }: TakeOfferModalProps) {
  const { t } = useThemeClasses()

  return (
    <Modal onClose={onClose} maxWidth="max-w-lg" closeOnOverlayClick>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-semibold ${t.text}`}>Take Offer</h2>
          <button
            onClick={onClose}
            className={`${t.textSecondary} hover:${t.text} transition-colors`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Market Offer Content */}
        <MarketOfferTab order={order} onOfferTaken={onOfferTaken} onClose={onClose} mode="modal" />
      </div>
    </Modal>
  )
}
