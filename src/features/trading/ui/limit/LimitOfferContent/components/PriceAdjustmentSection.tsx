import { useThemeClasses } from '@/shared/hooks'
import PriceAdjustmentSlider from '../../PriceAdjustmentSlider'

interface PriceAdjustmentSectionProps {
  requestedAdjustment: number
  setRequestedAdjustment: (val: number) => void
  offeredAdjustment: number
  setOfferedAdjustment: (val: number) => void
  originalRequestedAmounts: Array<{ amount: number; symbol: string }>
  originalOfferedAmounts: Array<{ amount: number; symbol: string }>
}

export function PriceAdjustmentSection({
  requestedAdjustment,
  setRequestedAdjustment,
  offeredAdjustment,
  setOfferedAdjustment,
  originalRequestedAmounts,
  originalOfferedAmounts,
}: PriceAdjustmentSectionProps) {
  const { t } = useThemeClasses()

  return (
    <div
      className={`space-y-3 p-3 rounded-lg ${t.cardHover} backdrop-blur-xl border ${t.border}`}
    >
      <h4 className={`text-xs font-medium ${t.text} mb-2`}>Price Adjustment</h4>
      <PriceAdjustmentSlider
        value={requestedAdjustment}
        onChange={setRequestedAdjustment}
        label="Requested Amounts"
        originalAmounts={originalRequestedAmounts}
      />
      <PriceAdjustmentSlider
        value={offeredAdjustment}
        onChange={setOfferedAdjustment}
        label="Offered Amounts"
        originalAmounts={originalOfferedAmounts}
      />
    </div>
  )
}
