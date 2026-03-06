'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Copy, Check, X } from 'lucide-react'
import type { ThemeClasses } from '@/shared/lib/theme'
import { Modal } from '@/shared/ui'

interface ReceiveModalProps {
  address: string
  isDark: boolean
  t: ThemeClasses
  onClose: () => void
}

export function ReceiveModal({ address, isDark, t, onClose }: ReceiveModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = address
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-sm">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-base font-semibold ${t.text}`}>Receive XCH</h2>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-200 text-slate-500'
            }`}
          >
            <X size={16} />
          </button>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-4">
          <div className="rounded-xl p-3 bg-white">
            <QRCodeSVG
              value={address}
              size={180}
              level="M"
              marginSize={0}
            />
          </div>
        </div>

        {/* Address label */}
        <p className={`${t.textSecondary} text-[10px] font-medium uppercase tracking-wide mb-1.5 text-center`}>
          Your XCH Address
        </p>

        {/* Address + copy */}
        <button
          type="button"
          onClick={handleCopy}
          className={`w-full flex items-center gap-2 rounded-xl px-3 py-2.5 border transition-all duration-200 text-left ${
            isDark
              ? 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'
              : 'bg-white/50 border-slate-200 hover:bg-white/70'
          }`}
        >
          <span
            className={`flex-1 text-xs font-mono ${t.text} break-all leading-relaxed`}
          >
            {address}
          </span>
          <span className="flex-shrink-0">
            {copied ? (
              <Check size={14} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
            ) : (
              <Copy size={14} className={t.textSecondary} />
            )}
          </span>
        </button>

        {/* Copied feedback */}
        <p
          className={`text-center text-[10px] font-medium mt-2 transition-opacity duration-200 ${
            copied ? 'opacity-100' : 'opacity-0'
          } ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}
        >
          Address copied to clipboard
        </p>
      </div>
    </Modal>
  )
}
