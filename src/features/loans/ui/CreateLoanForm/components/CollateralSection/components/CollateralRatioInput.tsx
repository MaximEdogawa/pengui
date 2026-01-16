import type { CreateLoanForm } from '@/entities/loan'
import type { ThemeClasses } from '@/shared/lib/theme'

interface CollateralRatioInputProps {
  formData: CreateLoanForm
  onUpdate: (updates: Partial<CreateLoanForm>) => void
  isDark: boolean
  t: ThemeClasses
}

export function CollateralRatioInput({ formData, onUpdate, isDark, t }: CollateralRatioInputProps) {
  return (
    <div>
      <label className={`${t.textSecondary} text-[10px] font-medium mb-1.5 block`}>
        Collateral Ratio (%)
      </label>
      <input
        type="number"
        value={formData.collateralRatio}
        onChange={(e) => onUpdate({ collateralRatio: e.target.value })}
        placeholder="150"
        min="100"
        max="300"
        className={`w-full px-2 py-1.5 rounded-lg text-xs ${
          isDark
            ? 'bg-white/5 border border-white/10 text-white placeholder:text-slate-500'
            : 'bg-white/40 border border-white/60 text-slate-800 placeholder:text-slate-500'
        } backdrop-blur-xl focus:outline-none focus:ring-2 ${
          isDark ? 'focus:ring-cyan-400/30' : 'focus:ring-cyan-600/30'
        }`}
      />
    </div>
  )
}
