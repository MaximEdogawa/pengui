'use client'

import { Clock } from 'lucide-react'
import type { CreateLoanForm } from '@/entities/loan'
import type { ThemeClasses } from '@/shared/lib/theme'

interface LoanTermsSectionProps {
  formData: CreateLoanForm
  interestRateValue: number
  onUpdate: (updates: Partial<CreateLoanForm>) => void
  onInterestRateChange: (value: number) => void
  isDark: boolean
  t: ThemeClasses
}

const durationOptions = [
  { label: '3 months', value: '3' },
  { label: '6 months', value: '6' },
  { label: '12 months', value: '12' },
  { label: '18 months', value: '18' },
  { label: '24 months', value: '24' },
  { label: '36 months', value: '36' },
]

export function LoanTermsSection({
  formData,
  interestRateValue,
  onUpdate,
  onInterestRateChange,
  isDark,
  t,
}: LoanTermsSectionProps) {
  return (
    <div
      className={`rounded-xl p-3 border ${
        isDark ? 'bg-white/5 border-white/10' : 'bg-white/20 border-white/30'
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Clock
          className={isDark ? 'text-cyan-400' : 'text-cyan-700'}
          size={14}
          strokeWidth={2}
        />
        <h3 className={`${t.text} text-sm font-semibold`}>Loan Terms</h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className={`${t.textSecondary} text-[10px] font-medium mb-1.5 block`}>
            Annual Interest Rate (APR)
          </label>
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max="25"
              step="0.1"
              value={interestRateValue}
              onChange={(e) => onInterestRateChange(parseFloat(e.target.value))}
              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700"
            />
            <div className="flex justify-between items-center">
              <span className={`${t.textSecondary} text-[10px]`}>0%</span>
              <div className="text-center">
                <span
                  className={`text-xl font-bold ${
                    isDark ? 'text-green-400' : 'text-green-600'
                  }`}
                >
                  {formData.interestRate}%
                </span>
                <span className={`${t.textSecondary} text-[10px] block`}>APR</span>
              </div>
              <span className={`${t.textSecondary} text-[10px]`}>25%</span>
            </div>
          </div>
        </div>

        <div>
          <label className={`${t.textSecondary} text-[10px] font-medium mb-1 block`}>
            Loan Term (months)
          </label>
          <select
            value={formData.duration}
            onChange={(e) => onUpdate({ duration: e.target.value })}
            className={`w-full px-2 py-1.5 rounded-lg text-xs ${
              isDark
                ? 'bg-white/5 border border-white/10 text-white'
                : 'bg-white/40 border border-white/60 text-slate-800'
            } backdrop-blur-xl focus:outline-none focus:ring-2 ${
              isDark ? 'focus:ring-cyan-400/30' : 'focus:ring-cyan-600/30'
            }`}
          >
            {durationOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={`${t.textSecondary} text-[10px] font-medium mb-1 block`}>
            Offer Valid Until
          </label>
          <input
            type="date"
            value={formData.validUntil}
            onChange={(e) => onUpdate({ validUntil: e.target.value })}
            min={new Date().toISOString().split('T')[0]}
            className={`w-full px-2 py-1.5 rounded-lg text-xs ${
              isDark
                ? 'bg-white/5 border border-white/10 text-white'
                : 'bg-white/40 border border-white/60 text-slate-800'
            } backdrop-blur-xl focus:outline-none focus:ring-2 ${
              isDark ? 'focus:ring-cyan-400/30' : 'focus:ring-cyan-600/30'
            }`}
          />
        </div>
      </div>
    </div>
  )
}
