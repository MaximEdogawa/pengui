'use client'

import { useThemeClasses } from '@/shared/hooks'
import { useId, useState } from 'react'
import { useShiftKeyHandler } from './SleekPriceSlider/useShiftKeyHandler'

interface SleekPriceSliderProps {
  value: number // Current adjustment percentage (-100 to +100)
  onChange: (value: number) => void
  label: string
  snapInterval?: number // Default 10
}

export default function SleekPriceSlider({
  value,
  onChange,
  label,
  snapInterval = 5,
}: SleekPriceSliderProps) {
  const { t } = useThemeClasses()
  const sliderId = useId()
  const [isFineTune, setIsFineTune] = useState(false)
  const isShiftPressed = useShiftKeyHandler()

  // Effective fine-tune mode: either toggle is on OR Shift is pressed
  const effectiveFineTune = isFineTune || isShiftPressed

  // Ensure value is always a valid number
  const safeValue = typeof value === 'number' && !isNaN(value) && isFinite(value) ? value : 0
  const clampedValue = Math.max(-100, Math.min(100, safeValue))

  // Handle slider change with snapping
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    let newValue = parseFloat(rawValue)

    // Validate
    if (isNaN(newValue) || !isFinite(newValue)) {
      return
    }

    // Apply snapping if not in fine-tune mode
    if (!effectiveFineTune) {
      // Snap to nearest interval
      newValue = Math.round(newValue / snapInterval) * snapInterval
    }

    // Clamp to -100 to +100
    newValue = Math.max(-100, Math.min(100, newValue))
    onChange(newValue)
  }

  // Format percentage for display
  const formatPercentage = (val: number): string => {
    if (val === 0) return '0%'
    const decimals = effectiveFineTune ? 2 : 1
    const formatted = val.toFixed(decimals)
    // Remove trailing zeros and decimal point if not needed
    const cleaned = formatted.replace(/\.?0+$/, '')
    if (val > 0) return `+${cleaned}%`
    return `${cleaned}%`
  }

  return (
    <div className="flex flex-col gap-1 py-0">
      {/* Label and Toggle on same row */}
      <div className="flex items-center justify-between">
        <label className={`text-[9px] ${t.textSecondary} font-normal`}>{label}</label>
        <button
          type="button"
          onClick={() => setIsFineTune(!isFineTune)}
          className={`text-[9px] px-1.5 py-0.5 rounded border transition-all ${
            effectiveFineTune
              ? 'bg-blue-500/10 border-blue-400/30 text-blue-600 dark:text-blue-400'
              : `${t.border} ${t.textSecondary}`
          }`}
          title={
            effectiveFineTune
              ? 'Fine-tune mode (or hold Shift)'
              : 'Click for fine-tune (or hold Shift)'
          }
        >
          {effectiveFineTune ? 'Fine' : 'Snap'}
        </button>
      </div>

      {/* Slider and Percentage Display row */}
      <div className="flex items-center gap-2">
        {/* Slider - fixed width, always same size */}
        <div className="flex-1 relative min-w-0">
          <input
            id={sliderId}
            type="range"
            min="-100"
            max="100"
            step={effectiveFineTune ? 0.1 : snapInterval}
            value={clampedValue}
            onChange={handleSliderChange}
            className="w-full h-0.5 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right,
                rgba(156, 163, 175, 0.3) 0%,
                rgba(156, 163, 175, 0.3) 100%)`,
            }}
          />
        </div>

        {/* Percentage Display - fixed width area */}
        <div className="flex items-center justify-end flex-shrink-0" style={{ minWidth: '2.5rem' }}>
          <span
            className={`text-[10px] font-semibold font-mono tabular-nums text-right ${
              clampedValue === 0
                ? t.textSecondary
                : clampedValue > 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
            }`}
          >
            {formatPercentage(clampedValue)}
          </span>
        </div>
      </div>
    </div>
  )
}
