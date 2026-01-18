'use client'

import { Shield } from 'lucide-react'
import type { CreateLoanForm } from '@/entities/loan'
import type { ThemeClasses } from '@/shared/lib/theme'
import { CollateralTypeSelector } from './CollateralSection/components/CollateralTypeSelector'
import { CollateralRatioInput } from './CollateralSection/components/CollateralRatioInput'

interface CollateralSectionProps {
  formData: CreateLoanForm
  onUpdate: (updates: Partial<CreateLoanForm>) => void
  isDark: boolean
  t: ThemeClasses
}

const collateralAssets = [{ label: 'XCH', value: 'XCH' }]

const nftCollections = [
  { label: 'ChiaPunks', value: 'ChiaPunks' },
  { label: 'ChiaArt', value: 'ChiaArt' },
  { label: 'ChiaCollectibles', value: 'ChiaCollectibles' },
]

const optionUnderlyings = [{ label: 'XCH', value: 'XCH' }]

const optionTypes = [
  { label: 'Call', value: 'Call' },
  { label: 'Put', value: 'Put' },
]

export function CollateralSection({ formData, onUpdate, isDark, t }: CollateralSectionProps) {
  return (
    <div
      className={`rounded-xl p-3 border ${
        isDark ? 'bg-white/5 border-white/10' : 'bg-white/20 border-white/30'
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Shield
          className={isDark ? 'text-cyan-400' : 'text-cyan-700'}
          size={14}
          strokeWidth={2}
        />
        <h3 className={`${t.text} text-sm font-semibold`}>Collateral Requirements</h3>
      </div>

      <div className="space-y-3">
        <CollateralTypeSelector formData={formData} onUpdate={onUpdate} isDark={isDark} t={t} />

        {formData.collateralAssetType === 'CAT' && (
          <div>
            <label className={`${t.textSecondary} text-[10px] font-medium mb-1 block`}>
              Asset
            </label>
            <select
              value={formData.collateralType}
              onChange={(e) => onUpdate({ collateralType: e.target.value })}
              className={`w-full px-2 py-1.5 rounded-lg text-xs ${
                isDark
                  ? 'bg-white/5 border border-white/10 text-white'
                  : 'bg-white/40 border border-white/60 text-slate-800'
              } backdrop-blur-xl focus:outline-none focus:ring-2 ${
                isDark ? 'focus:ring-cyan-400/30' : 'focus:ring-cyan-600/30'
              }`}
            >
              {collateralAssets.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {formData.collateralAssetType === 'NFT' && (
          <div className="space-y-2">
            <div>
              <label className={`${t.textSecondary} text-[10px] font-medium mb-1 block`}>
                NFT Collection
              </label>
              <select
                value={formData.collateralNftCollection}
                onChange={(e) => onUpdate({ collateralNftCollection: e.target.value })}
                className={`w-full px-2 py-1.5 rounded-lg text-xs ${
                  isDark
                    ? 'bg-white/5 border border-white/10 text-white'
                    : 'bg-white/40 border border-white/60 text-slate-800'
                } backdrop-blur-xl focus:outline-none focus:ring-2 ${
                  isDark ? 'focus:ring-cyan-400/30' : 'focus:ring-cyan-600/30'
                }`}
              >
                <option value="">Select collection</option>
                {nftCollections.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={`${t.textSecondary} text-[10px] font-medium mb-1 block`}>
                Floor Price (XCH)
              </label>
              <input
                type="number"
                value={formData.collateralNftFloor}
                onChange={(e) => onUpdate({ collateralNftFloor: e.target.value })}
                placeholder="25.5"
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
        )}

        {formData.collateralAssetType === 'Options' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={`${t.textSecondary} text-[10px] font-medium mb-1 block`}>
                Underlying
              </label>
              <select
                value={formData.collateralOptionUnderlying}
                onChange={(e) => onUpdate({ collateralOptionUnderlying: e.target.value })}
                className={`w-full px-2 py-1.5 rounded-lg text-xs ${
                  isDark
                    ? 'bg-white/5 border border-white/10 text-white'
                    : 'bg-white/40 border border-white/60 text-slate-800'
                } backdrop-blur-xl focus:outline-none focus:ring-2 ${
                  isDark ? 'focus:ring-cyan-400/30' : 'focus:ring-cyan-600/30'
                }`}
              >
                {optionUnderlyings.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={`${t.textSecondary} text-[10px] font-medium mb-1 block`}>
                Type
              </label>
              <select
                value={formData.collateralOptionType}
                onChange={(e) =>
                  onUpdate({
                    collateralOptionType: e.target.value as 'Call' | 'Put',
                  })
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
          </div>
        )}

        <CollateralRatioInput formData={formData} onUpdate={onUpdate} isDark={isDark} t={t} />
      </div>
    </div>
  )
}
