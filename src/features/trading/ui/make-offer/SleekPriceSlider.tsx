'use client'

import { useThemeClasses } from '@/shared/hooks'
import { useEffect, useId, useState } from 'react'

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
  const styleId = useId()
  const [isFineTune, setIsFineTune] = useState(false)
  const [isShiftPressed, setIsShiftPressed] = useState(false)

  // Escape ID for use in CSS selectors (useId can produce IDs with colons)
  const escapeCSSId = (id: string): string => {
    if (typeof CSS !== 'undefined' && CSS.escape) {
      return CSS.escape(id)
    }
    // Fallback: escape special characters manually
    return id.replace(/[^a-zA-Z0-9_-]/g, (char) => {
      const code = char.charCodeAt(0)
      if (code <= 0xff) {
        return `\\${code.toString(16).padStart(2, '0')} `
      }
      return `\\${code.toString(16)} `
    })
  }

  const cssEscapedSliderId = escapeCSSId(sliderId)

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

  // Slider color based on value
  const sliderColor = clampedValue === 0 ? '#9ca3af' : clampedValue > 0 ? '#22c55e' : '#ef4444'

  // Inject slider styles
  useEffect(() => {
    let styleElement = document.getElementById(styleId) as HTMLStyleElement | null

    if (!styleElement) {
      styleElement = document.createElement('style')
      styleElement.id = styleId
      document.head.appendChild(styleElement)
    }

    styleElement.textContent = `
      #${cssEscapedSliderId}::-webkit-slider-thumb {
        appearance: none;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: ${sliderColor};
        border: 1.5px solid rgba(255, 255, 255, 0.9);
        cursor: pointer;
        box-shadow: 0 0 0 1.5px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.15);
        transition: all 0.2s ease;
      }
      #${cssEscapedSliderId}::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.25);
      }
      #${cssEscapedSliderId}::-moz-range-thumb {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: ${sliderColor};
        border: 1.5px solid rgba(255, 255, 255, 0.9);
        cursor: pointer;
        box-shadow: 0 0 0 1.5px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.15);
        transition: all 0.2s ease;
      }
      #${cssEscapedSliderId}::-moz-range-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.25);
      }
    `

    return () => {
      const element = document.getElementById(styleId)
      if (element) {
        element.remove()
      }
    }
  }, [sliderColor])

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
