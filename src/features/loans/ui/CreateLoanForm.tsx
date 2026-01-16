'use client'

import { getThemeClasses } from '@/shared/lib/theme'
import type { CreateLoanForm } from '@/entities/loan'
import { useTheme } from 'next-themes'
import { useCreateLoanForm } from './CreateLoanForm/hooks/useCreateLoanForm'
import { LoanAssetSection } from './CreateLoanForm/components/LoanAssetSection'
import { LoanTermsSection } from './CreateLoanForm/components/LoanTermsSection'
import { CollateralSection } from './CreateLoanForm/components/CollateralSection'
import { OptionContractSection } from './CreateLoanForm/components/OptionContractSection'

interface CreateLoanFormProps {
  onSubmit?: (formData: CreateLoanForm) => void
}

export default function CreateLoanFormComponent({ onSubmit }: CreateLoanFormProps) {
  const { theme: currentTheme, systemTheme } = useTheme()
  const isDark = currentTheme === 'dark' || (currentTheme === 'system' && systemTheme === 'dark')
  const t = getThemeClasses(isDark)

  const { formData, interestRateValue, updateFormData, updateInterestRate } = useCreateLoanForm()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSubmit) {
      onSubmit(formData)
    }
  }

  return (
    <div
      className={`backdrop-blur-[40px] ${t.card} rounded-2xl p-4 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 ${
        isDark ? 'bg-white/[0.03]' : 'bg-white/30'
      }`}
    >
      <div className="mb-3">
        <h2 className={`${t.text} text-lg font-semibold mb-1`}>Create Loan Offer</h2>
        <p className={`${t.textSecondary} text-xs`}>Set up your lending parameters</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <LoanAssetSection
          formData={formData}
          onUpdate={updateFormData}
          isDark={isDark}
          t={t}
        />

        <LoanTermsSection
          formData={formData}
          interestRateValue={interestRateValue}
          onUpdate={updateFormData}
          onInterestRateChange={updateInterestRate}
          isDark={isDark}
          t={t}
        />
        <CollateralSection
          formData={formData}
          onUpdate={updateFormData}
          isDark={isDark}
          t={t}
        />
        <OptionContractSection
          formData={formData}
          onUpdate={updateFormData}
          isDark={isDark}
          t={t}
        />

        {/* Submit Button */}
        <button
          type="submit"
          className={`w-full py-2 rounded-lg font-medium text-xs transition-all ${
            isDark
              ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 text-cyan-400 hover:from-cyan-500/30 hover:to-blue-500/30'
              : 'bg-gradient-to-r from-cyan-600/30 to-blue-600/30 border border-cyan-600/40 text-cyan-700 hover:from-cyan-600/40 hover:to-blue-600/40'
          }`}
        >
          Create Loan Offer
        </button>
      </form>
    </div>
  )
}
