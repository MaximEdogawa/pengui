'use client'

import { X } from 'lucide-react'

interface RemoveAssetButtonProps {
  onRemove: () => void
}

export default function RemoveAssetButton({ onRemove }: RemoveAssetButtonProps) {
  return (
    <button
      onClick={onRemove}
      className="flex-shrink-0 p-1.5 rounded-lg text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      aria-label="Remove asset"
    >
      <X size={16} />
    </button>
  )
}
