'use client'

import { useThemeClasses } from '@/shared/hooks'
import { InputHTMLAttributes, ReactNode } from 'react'

export interface FormInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label: string | ReactNode
  error?: string
  helperText?: ReactNode
}

export default function FormInput({ label, error, helperText, name, id, ...inputProps }: FormInputProps) {
  const { isDark, t } = useThemeClasses()
  const inputId = id || name || `input-${Math.random().toString(36).substr(2, 9)}`

  return (
    <div>
      <label htmlFor={inputId} className={`${t.textSecondary} text-xs font-medium mb-2 block`}>{label}</label>
      <input
        {...inputProps}
        id={inputId}
        name={name}
        className={`w-full px-4 py-3 rounded-xl backdrop-blur-xl ${t.input} ${t.text} placeholder:${t.textSecondary} focus:outline-none focus:ring-2 ${
          error ? 'ring-2 ring-red-500/50' : t.focusRing
        } transition-all`}
      />
      {error && (
        <p className={`${isDark ? 'text-red-400' : 'text-red-600'} text-xs mt-1`}>{error}</p>
      )}
      {helperText && !error && (
        <div className={`${t.textSecondary} text-xs mt-1`}>{helperText}</div>
      )}
    </div>
  )
}
