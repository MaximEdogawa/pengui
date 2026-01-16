'use client'

import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { useThemeClasses } from '@/shared/hooks'

interface TransactionStatusProps {
  type: 'success' | 'error' | null
  message: string
}

export default function TransactionStatus({ type, message }: TransactionStatusProps) {
  const { isDark } = useThemeClasses()

  if (!type) return null

  return (
    <div
      className={`p-3 rounded-xl flex items-start gap-2 ${
        type === 'success'
          ? isDark
            ? 'bg-emerald-500/10 border border-emerald-400/30'
            : 'bg-emerald-50 border border-emerald-200'
          : isDark
            ? 'bg-red-500/10 border border-red-400/30'
            : 'bg-red-50 border border-red-200'
      }`}
    >
      {type === 'success' ? (
        <CheckCircle2
          className={`${isDark ? 'text-emerald-400' : 'text-emerald-600'} flex-shrink-0 mt-0.5`}
          size={16}
        />
      ) : (
        <AlertCircle
          className={`${isDark ? 'text-red-400' : 'text-red-600'} flex-shrink-0 mt-0.5`}
          size={16}
        />
      )}
      <p
        className={`text-xs ${
          type === 'success'
            ? isDark
              ? 'text-emerald-400'
              : 'text-emerald-700'
            : isDark
              ? 'text-red-400'
              : 'text-red-700'
        }`}
      >
        {message}
      </p>
    </div>
  )
}
