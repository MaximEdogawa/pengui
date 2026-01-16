import { RotateCcw } from 'lucide-react'
import type { ThemeClasses } from '@/shared/lib/theme'
import SleekPriceSlider from '../../SleekPriceSlider'

interface PriceAdjustmentSlidersProps {
  requestedAdjustment: number
  setRequestedAdjustment: (value: number) => void
  offeredAdjustment: number
  setOfferedAdjustment: (value: number) => void
  t: ThemeClasses
}

/**
 * Extract price adjustment sliders to reduce CreateOfferForm size
 */
export function PriceAdjustmentSliders({
  requestedAdjustment,
  setRequestedAdjustment,
  offeredAdjustment,
  setOfferedAdjustment,
  t,
}: PriceAdjustmentSlidersProps) {
  return (
    <div
      className="p-2 rounded-lg backdrop-blur-xl bg-white/5 dark:bg-black/5 border border-white/10 dark:border-white/5"
      style={{
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <h4 className={`text-[10px] font-medium ${t.textSecondary} uppercase tracking-wide`}>
          Price Adjustment
        </h4>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setRequestedAdjustment(0)
            setOfferedAdjustment(0)
          }}
          className={`p-1 rounded hover:bg-white/10 dark:hover:bg-black/10 transition-colors ${t.textSecondary} hover:text-current`}
          title="Reset to original prices"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>
      <div className="space-y-1.5">
        <SleekPriceSlider
          value={requestedAdjustment}
          onChange={setRequestedAdjustment}
          label="Requested Amounts"
        />
        <SleekPriceSlider
          value={offeredAdjustment}
          onChange={setOfferedAdjustment}
          label="Offered Amounts"
        />
      </div>
    </div>
  )
}
