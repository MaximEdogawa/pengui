'use client'

import { getThemeClasses } from '@/shared/lib/theme'
import type { CreateLoanForm } from '@/entities/loan'
import { Calendar, Clock, DollarSign, Shield } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useState } from 'react'

interface CreateLoanFormProps {
  onSubmit?: (formData: CreateLoanForm) => void
}

export default function CreateLoanFormComponent({ onSubmit }: CreateLoanFormProps) {
  const { theme: currentTheme, systemTheme } = useTheme()
  const isDark = currentTheme === 'dark' || (currentTheme === 'system' && systemTheme === 'dark')
  const t = getThemeClasses(isDark)

  const [formData, setFormData] = useState<CreateLoanForm>({
    assetType: 'CAT',
    amount: '',
    currency: 'b.USDC',
    interestRate: '8.0',
    duration: '12',
    collateralAssetType: 'XCH',
    collateralType: 'XCH',
    collateralRatio: '150',
    optionType: 'Call',
    strikePrice: '',
    validUntil: '',
    nftCollection: '',
    nftTokenId: '',
    optionUnderlying: 'XCH',
    optionContractType: 'Call',
    optionStrike: '',
    optionQuantity: '',
    collateralNftCollection: '',
    collateralNftFloor: '',
    collateralOptionUnderlying: 'XCH',
    collateralOptionType: 'Call',
  })

  // Keep interest rate as number for slider (needs number type), sync with formData.interestRate (string)
  const [interestRateValue, setInterestRateValue] = useState(8.0)

  const currencyOptions = [
    { label: 'b.USDC', value: 'b.USDC' },
    { label: 'b.USDT', value: 'b.USDT' },
    { label: 'XCH', value: 'XCH' },
  ]

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

  const durationOptions = [
    { label: '3 months', value: '3' },
    { label: '6 months', value: '6' },
    { label: '12 months', value: '12' },
    { label: '18 months', value: '18' },
    { label: '24 months', value: '24' },
    { label: '36 months', value: '36' },
  ]

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
        {/* Loan Asset Section */}
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
                  onClick={() => setFormData({ ...formData, assetType: type })}
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
              <div>
                <label className={`${t.textSecondary} text-[10px] font-medium mb-1 block`}>
                  Amount
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="10000"
                  className={`w-full px-2 py-1.5 rounded-lg text-xs ${
                    isDark
                      ? 'bg-white/5 border border-white/10 text-white placeholder:text-slate-500'
                      : 'bg-white/40 border border-white/60 text-slate-800 placeholder:text-slate-500'
                  } backdrop-blur-xl focus:outline-none focus:ring-2 ${
                    isDark ? 'focus:ring-cyan-400/30' : 'focus:ring-cyan-600/30'
                  }`}
                />
              </div>
              <div>
                <label className={`${t.textSecondary} text-[10px] font-medium mb-1 block`}>
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className={`w-full px-2 py-1.5 rounded-lg text-xs ${
                    isDark
                      ? 'bg-white/5 border border-white/10 text-white'
                      : 'bg-white/40 border border-white/60 text-slate-800'
                  } backdrop-blur-xl focus:outline-none focus:ring-2 ${
                    isDark ? 'focus:ring-cyan-400/30' : 'focus:ring-cyan-600/30'
                  }`}
                >
                  {currencyOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* NFT Fields */}
          {formData.assetType === 'NFT' && (
            <div className="space-y-2">
              <div>
                <label className={`${t.textSecondary} text-[10px] font-medium mb-1 block`}>
                  Collection
                </label>
                <select
                  value={formData.nftCollection}
                  onChange={(e) => setFormData({ ...formData, nftCollection: e.target.value })}
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`${t.textSecondary} text-[10px] font-medium mb-1 block`}>
                    Token ID
                  </label>
                  <input
                    type="text"
                    value={formData.nftTokenId}
                    onChange={(e) => setFormData({ ...formData, nftTokenId: e.target.value })}
                    placeholder="#1234"
                    className={`w-full px-2 py-1.5 rounded-lg text-xs ${
                      isDark
                        ? 'bg-white/5 border border-white/10 text-white placeholder:text-slate-500'
                        : 'bg-white/40 border border-white/60 text-slate-800 placeholder:text-slate-500'
                    } backdrop-blur-xl focus:outline-none focus:ring-2 ${
                      isDark ? 'focus:ring-cyan-400/30' : 'focus:ring-cyan-600/30'
                    }`}
                  />
                </div>
                <div>
                  <label className={`${t.textSecondary} text-[10px] font-medium mb-1 block`}>
                    Est. Value
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="50"
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
          )}

          {/* Options Fields */}
          {formData.assetType === 'Options' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`${t.textSecondary} text-[10px] font-medium mb-1 block`}>
                    Underlying
                  </label>
                  <select
                    value={formData.optionUnderlying}
                    onChange={(e) => setFormData({ ...formData, optionUnderlying: e.target.value })}
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
                    value={formData.optionContractType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        optionContractType: e.target.value as 'Call' | 'Put',
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
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={`${t.textSecondary} text-[10px] font-medium mb-1 block`}>
                    Strike
                  </label>
                  <input
                    type="number"
                    value={formData.optionStrike}
                    onChange={(e) => setFormData({ ...formData, optionStrike: e.target.value })}
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
                <div>
                  <label className={`${t.textSecondary} text-[10px] font-medium mb-1 block`}>
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={formData.optionQuantity}
                    onChange={(e) => setFormData({ ...formData, optionQuantity: e.target.value })}
                    placeholder="10"
                    className={`w-full px-2 py-1.5 rounded-lg text-xs ${
                      isDark
                        ? 'bg-white/5 border border-white/10 text-white placeholder:text-slate-500'
                        : 'bg-white/40 border border-white/60 text-slate-800 placeholder:text-slate-500'
                    } backdrop-blur-xl focus:outline-none focus:ring-2 ${
                      isDark ? 'focus:ring-cyan-400/30' : 'focus:ring-cyan-600/30'
                    }`}
                  />
                </div>
                <div>
                  <label className={`${t.textSecondary} text-[10px] font-medium mb-1 block`}>
                    Value
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="5000"
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
          )}
        </div>

        {/* Loan Terms */}
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
                  onChange={(e) => {
                    const value = parseFloat(e.target.value)
                    if (!Number.isNaN(value)) {
                      setInterestRateValue(value)
                      setFormData({ ...formData, interestRate: value.toFixed(1) })
                    }
                  }}
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
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
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

        {/* Collateral Requirements */}
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
            <div>
              <label className={`${t.textSecondary} text-[10px] font-medium mb-1.5 block`}>
                Collateral Type
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['CAT', 'NFT', 'Options'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, collateralAssetType: type })}
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

            {formData.collateralAssetType === 'CAT' && (
              <div>
                <label className={`${t.textSecondary} text-[10px] font-medium mb-1 block`}>
                  Asset
                </label>
                <select
                  value={formData.collateralType}
                  onChange={(e) => setFormData({ ...formData, collateralType: e.target.value })}
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
                    onChange={(e) =>
                      setFormData({ ...formData, collateralNftCollection: e.target.value })
                    }
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
                    onChange={(e) =>
                      setFormData({ ...formData, collateralNftFloor: e.target.value })
                    }
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
                    onChange={(e) =>
                      setFormData({ ...formData, collateralOptionUnderlying: e.target.value })
                    }
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
                      setFormData({
                        ...formData,
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

            <div>
              <label className={`${t.textSecondary} text-[10px] font-medium mb-1.5 block`}>
                Collateral Ratio (%)
              </label>
              <input
                type="number"
                value={formData.collateralRatio}
                onChange={(e) => setFormData({ ...formData, collateralRatio: e.target.value })}
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
          </div>
        </div>

        {/* Option Contract Terms (Optional) */}
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
                  setFormData({ ...formData, optionType: e.target.value as 'Call' | 'Put' })
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
                onChange={(e) => setFormData({ ...formData, strikePrice: e.target.value })}
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
