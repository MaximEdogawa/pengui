'use client'

import { useThemeClasses } from '@/shared/hooks'
import { type ReactNode } from 'react'

export interface ModalProps {
  children: ReactNode
  onClose: () => void
  maxWidth?: string
  className?: string
  closeOnOverlayClick?: boolean
}

export default function Modal({
  children,
  onClose,
  maxWidth = 'max-w-5xl',
  className = '',
  closeOnOverlayClick = true,
}: ModalProps) {
  const { isDark } = useThemeClasses()

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center p-4 z-50 ${
        isDark ? 'bg-black/50' : 'bg-black/30'
      } backdrop-blur-sm`}
      onClick={(e) => {
        // Close modal when clicking on the overlay (not the modal content)
        if (closeOnOverlayClick && e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className={`backdrop-blur-[40px] rounded-lg shadow-xl ${maxWidth} w-full max-h-[85vh] my-auto overflow-y-auto border transition-all duration-300 ${
          isDark ? 'bg-white/10 border-white/20' : 'bg-white/60 border-white/70'
        } ${className}`}
      >
        {children}
      </div>
    </div>
  )
}
