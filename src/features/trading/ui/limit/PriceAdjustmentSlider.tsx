'use client'

import { useThemeClasses } from '@/shared/hooks'
import { useCallback, useEffect, useState } from 'react'

interface PriceAdjustmentSliderProps {
  value: number // Current adjustment percentage (-100 to +100)
  onChange: (value: number) => void
  label: string
  snapInterval?: number // Default 10
  originalAmounts: Array<{ amount: number; symbol: string }>
}

export default function PriceAdjustmentSlider({
  value,
  onChange,
  label,
  snapInterval = 10,
  originalAmounts,
}: PriceAdjustmentSliderProps) {
  const { t } = useThemeClasses()
  const [isFineTune, setIsFineTune] = useState(false)
  const [isShiftPressed, setIsShiftPressed] = useState(false)

  // Handle Shift key for fine-tuning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  const effectiveFineTune = isFineTune || isShiftPressed

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let newValue = parseFloat(e.target.value)

      // Apply snapping if not in fine-tune mode
      if (!effectiveFineTune) {
        // Snap to nearest interval
        newValue = Math.round(newValue / snapInterval) * snapInterval
        // Clamp to -100 to +100
        newValue = Math.max(-100, Math.min(100, newValue))
      } else {
        // Fine-tune mode: allow continuous but clamp
        newValue = Math.max(-100, Math.min(100, newValue))
      }

      onChange(newValue)
    },
    [onChange, snapInterval, effectiveFineTune]
  )

  // Calculate adjusted amounts
  const adjustedAmounts = originalAmounts.map((item) => ({
    ...item,
    adjustedAmount: item.amount * (1 + value / 100),
  }))

  const formatPercentage = (val: number): string => {
    if (val === 0) return '0%'
    if (val > 0) return `+${val.toFixed(effectiveFineTune ? 2 : 0)}%`
    return `${val.toFixed(effectiveFineTune ? 2 : 0)}%`
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className={`text-xs font-medium ${t.text}`}>{label}</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsFineTune(!isFineTune)}
            className={`text-[10px] px-1.5 py-0.5 rounded border ${
              effectiveFineTune
                ? 'bg-blue-500/10 border-blue-400/30 text-blue-600 dark:text-blue-400'
                : `${t.border} ${t.textSecondary}`
            } transition-all`}
            title={
              effectiveFineTune
                ? 'Fine-tune mode (or hold Shift)'
                : 'Click for fine-tune (or hold Shift)'
            }
          >
            {effectiveFineTune ? 'Fine' : 'Snap'}
          </button>
          <span
            className={`text-xs font-semibold font-mono ${
              value === 0
                ? t.textSecondary
                : value > 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
            }`}
          >
            {formatPercentage(value)}
          </span>
        </div>
      </div>

      <div className="relative">
        <input
          type="range"
          min="-100"
          max="100"
          step={effectiveFineTune ? 0.1 : snapInterval}
          value={value}
          onChange={handleSliderChange}
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, 
              ${value < 0 ? '#ef4444' : '#22c55e'} 0%, 
              ${value < 0 ? '#ef4444' : '#22c55e'} ${Math.abs(value)}%, 
              #e5e7eb 0%, 
              #e5e7eb 100%)`,
          }}
        />
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-gray-500 dark:text-gray-400">-100%</span>
          <span className="text-[9px] text-gray-500 dark:text-gray-400">0%</span>
          <span className="text-[9px] text-gray-500 dark:text-gray-400">+100%</span>
        </div>
      </div>

      {/* Show adjusted amounts preview */}
      {adjustedAmounts.length > 0 && (
        <div className={`text-xs ${t.textSecondary} space-y-0.5`}>
          {adjustedAmounts.map((item, idx) => (
            <div key={idx} className="flex justify-between">
              <span>{item.symbol}:</span>
              <span className="font-mono">
                {item.adjustedAmount.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6,
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
