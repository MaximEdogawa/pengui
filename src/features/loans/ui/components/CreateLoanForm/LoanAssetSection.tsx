'use client'

import React from 'react'
import { DollarSign } from 'lucide-react'
import type { CreateLoanForm } from '@/entities/loan'
import type { ThemeClasses } from '@/shared/lib/theme'

interface LoanAssetSectionProps {
  formData: CreateLoanForm
  onUpdate: (updates: Partial<CreateLoanForm>) => void
  isDark: boolean
  t: ThemeClasses
}

const currencyOptions = [
  { label: 'b.USDC', value: 'b.USDC' },
  { label: 'b.USDT', value: 'b.USDT' },
  { label: 'XCH', value: 'XCH' },
]

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

const getInputClasses = (isDark: boolean) =>
  `w-full px-2 py-1.5 rounded-lg text-xs backdrop-blur-xl focus:outline-none focus:ring-2 ${
    isDark
      ? 'bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:ring-cyan-400/30'
      : 'bg-white/40 border border-white/60 text-slate-800 placeholder:text-slate-500 focus:ring-cyan-600/30'
  }`

const getSelectClasses = (isDark: boolean) =>
  `w-full px-2 py-1.5 rounded-lg text-xs backdrop-blur-xl focus:outline-none focus:ring-2 ${
    isDark
      ? 'bg-white/5 border border-white/10 text-white focus:ring-cyan-400/30'
      : 'bg-white/40 border border-white/60 text-slate-800 focus:ring-cyan-600/30'
  }`

const Label = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <label className={`${className} text-[10px] font-medium mb-1 block`}>{children}</label>
)

const InputField = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  isDark,
  t,
}: {
  label: string
  value: string | number
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  isDark: boolean
  t: ThemeClasses
}) => (
  <div>
    <Label className={t.textSecondary}>{label}</Label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={getInputClasses(isDark)}
    />
  </div>
)

const SelectField = ({
  label,
  value,
  onChange,
  options,
  isDark,
  t,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ label: string; value: string }>
  isDark: boolean
  t: ThemeClasses
}) => (
  <div>
    <Label className={t.textSecondary}>{label}</Label>
    <select value={value} onChange={(e) => onChange(e.target.value)} className={getSelectClasses(isDark)}>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
)

export function LoanAssetSection({ formData, onUpdate, isDark, t }: LoanAssetSectionProps) {
  return (
    <div
      className={`rounded-xl p-3 border ${
        isDark ? 'bg-white/5 border-white/10' : 'bg-white/20 border-white/30'
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <DollarSign
          className={isDark ? 'text-cyan-400' : 'text-cyan-700'}
          size={14}
          strokeWidth={2}
        />
        <h3 className={`${t.text} text-sm font-semibold`}>Loan Asset</h3>
      </div>

      {/* Asset Type Selector */}
      <div className="mb-3">
        <label className={`${t.textSecondary} text-[10px] font-medium mb-1.5 block`}>
          Asset Type
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {(['CAT', 'NFT', 'Options'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onUpdate({ assetType: type })}
              className={`px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                formData.assetType === type
                  ? isDark
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                    : 'bg-cyan-600 text-white border border-cyan-600'
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

      {/* CAT Fields */}
      {formData.assetType === 'CAT' && (
        <div className="grid grid-cols-2 gap-2">
          <InputField
            label="Amount"
            value={formData.amount}
            onChange={(value) => onUpdate({ amount: value })}
            placeholder="10000"
            type="number"
            isDark={isDark}
            t={t}
          />
          <SelectField
            label="Currency"
            value={formData.currency}
            onChange={(value) => onUpdate({ currency: value })}
            options={currencyOptions}
            isDark={isDark}
            t={t}
          />
        </div>
      )}

      {/* NFT Fields */}
      {formData.assetType === 'NFT' && (
        <div className="space-y-2">
          <div>
            <Label className={t.textSecondary}>Collection</Label>
            <select
              value={formData.nftCollection}
              onChange={(e) => onUpdate({ nftCollection: e.target.value })}
              className={getSelectClasses(isDark)}
            >
              <option value="">Select collection</option>
              {nftCollections.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <InputField
              label="Token ID"
              value={formData.nftTokenId}
              onChange={(value) => onUpdate({ nftTokenId: value })}
              placeholder="#1234"
              isDark={isDark}
              t={t}
            />
            <InputField
              label="Est. Value"
              value={formData.amount}
              onChange={(value) => onUpdate({ amount: value })}
              placeholder="50"
              type="number"
              isDark={isDark}
              t={t}
            />
          </div>
        </div>
      )}

      {/* Options Fields */}
      {formData.assetType === 'Options' && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <SelectField
              label="Underlying"
              value={formData.optionUnderlying}
              onChange={(value) => onUpdate({ optionUnderlying: value })}
              options={optionUnderlyings}
              isDark={isDark}
              t={t}
            />
            <div>
              <Label className={t.textSecondary}>Type</Label>
              <select
                value={formData.optionContractType}
                onChange={(e) => onUpdate({ optionContractType: e.target.value as 'Call' | 'Put' })}
                className={getSelectClasses(isDark)}
              >
                {optionTypes.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <InputField
              label="Strike"
              value={formData.optionStrike}
              onChange={(value) => onUpdate({ optionStrike: value })}
              placeholder="2500"
              type="number"
              isDark={isDark}
              t={t}
            />
            <InputField
              label="Quantity"
              value={formData.optionQuantity}
              onChange={(value) => onUpdate({ optionQuantity: value })}
              placeholder="10"
              type="number"
              isDark={isDark}
              t={t}
            />
            <InputField
              label="Value"
              value={formData.amount}
              onChange={(value) => onUpdate({ amount: value })}
              placeholder="5000"
              type="number"
              isDark={isDark}
              t={t}
            />
          </div>
        </div>
      )}
    </div>
  )
}
