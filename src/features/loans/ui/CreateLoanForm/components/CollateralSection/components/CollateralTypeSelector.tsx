import type { CreateLoanForm } from '@/entities/loan'
import type { ThemeClasses } from '@/shared/lib/theme'

interface CollateralTypeSelectorProps {
  formData: CreateLoanForm
  onUpdate: (updates: Partial<CreateLoanForm>) => void
  isDark: boolean
  t: ThemeClasses
}

export function CollateralTypeSelector({ formData, onUpdate, isDark, t }: CollateralTypeSelectorProps) {
  return (
    <div>
      <label className={`${t.textSecondary} text-[10px] font-medium mb-1.5 block`}>
        Collateral Type
      </label>
      <div className="grid grid-cols-3 gap-1.5">
        {(['CAT', 'NFT', 'Options'] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onUpdate({ collateralAssetType: type })}
            className={`px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
              formData.collateralAssetType === type
                ? isDark
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-400/30'
                  : 'bg-orange-600 text-white border border-orange-600'
                : isDark
                  ? 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                  : 'bg-white/40 border border-white/60 text-slate-800 hover:bg-white/50'
            }`}
          >
            {type}
          </button>
        ))}
      </div>
    </div>
  )
}
