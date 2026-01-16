'use client'

import { X } from 'lucide-react'
import type { ThemeClasses } from '@/shared/lib/theme'

interface OfferDetailsHeaderProps {
  onClose: () => void
  t: ThemeClasses
}

export function OfferDetailsHeader({ onClose, t }: OfferDetailsHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className={`text-lg font-semibold ${t.text}`}>Offer Details</h2>
      <button onClick={onClose} className={`${t.textSecondary} hover:${t.text}`}>
        <X size={18} />
      </button>
    </div>
  )
}
