'use client'

import { Calendar } from 'lucide-react'
import type { CreateLoanForm } from '@/entities/loan'
import type { ThemeClasses } from '@/shared/lib/theme'

interface OptionContractSectionProps {
  formData: CreateLoanForm
  onUpdate: (updates: Partial<CreateLoanForm>) => void
  isDark: boolean
  t: ThemeClasses
}

const optionTypes = [
  { label: 'Call', value: 'Call' },
  { label: 'Put', value: 'Put' },
]

export function OptionContractSection({
  formData,
  onUpdate,
  isDark,
  t,
}: OptionContractSectionProps) {
  return (
    <div
      className={`rounded-xl p-3 border ${
        isDark ? 'bg-white/5 border-white/10' : 'bg-white/20 border-white/30'
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Calendar
          className={isDark ? 'text-cyan-400' : 'text-cyan-700'}
          size={14}
          strokeWidth={2}
        />
        <h3 className={`${t.text} text-sm font-semibold`}>Option Contract Terms (Optional)</h3>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={`${t.textSecondary} text-[10px] font-medium mb-1 block`}>
            Option Type
          </label>
          <select
            value={formData.optionType}
            onChange={(e) =>
              onUpdate({ optionType: e.target.value as 'Call' | 'Put' })
            }
            className={`w-full px-2 py-1.5 rounded-lg text-xs ${
              isDark
                ? 'bg-white/5 border border-white/10 text-white'
                : 'bg-white/40 border border-white/60 text-slate-800'
            } backdrop-blur-xl focus:outline-none focus:ring-2 ${
              isDark ? 'focus:ring-cyan-400/30' : 'focus:ring-cyan-600/30'
            }`}
          >
            {optionTypes.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={`${t.textSecondary} text-[10px] font-medium mb-1 block`}>
            Strike Price
          </label>
          <input
            type="number"
            value={formData.strikePrice}
            onChange={(e) => onUpdate({ strikePrice: e.target.value })}
            placeholder="2500"
            className={`w-full px-2 py-1.5 rounded-lg text-xs ${
              isDark
                ? 'bg-white/5 border border-white/10 text-white placeholder:text-slate-500'
                : 'bg-white/40 border border-white/60 text-slate-800 placeholder:text-slate-500'
            } backdrop-blur-xl focus:outline-none focus:ring-2 ${
              isDark ? 'focus:ring-cyan-400/30' : 'focus:ring-cyan-600/30'
            }`}
          />
        </div>
      </div>
    </div>
  )
}
