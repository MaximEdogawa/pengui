import { useState } from 'react'

interface UseCreateOfferFormStateProps {
  initialPriceAdjustments?: { requested: number; offered: number }
}

/**
 * Extract form state management to reduce CreateOfferForm size
 */
export function useCreateOfferFormState({ initialPriceAdjustments }: UseCreateOfferFormStateProps) {
  // Price adjustment sliders
  const [requestedAdjustment, setRequestedAdjustment] = useState(
    initialPriceAdjustments?.requested || 0
  )
  const [offeredAdjustment, setOfferedAdjustment] = useState(initialPriceAdjustments?.offered || 0)

  // Manual edit tracking - prevents sliders from overwriting manual edits
  const [manuallyEdited, setManuallyEdited] = useState<{
    requested: Set<number>
    offered: Set<number>
  }>({ requested: new Set(), offered: new Set() })

  // Base amounts (from order or when slider was last at 0)
  const [baseAmounts, setBaseAmounts] = useState<{
    requested: number[]
    offered: number[]
  }>({ requested: [], offered: [] })

  // Expiration settings
  const [expirationEnabled, setExpirationEnabled] = useState(false)
  const [expirationDays, setExpirationDays] = useState(1)
  const [expirationHours, setExpirationHours] = useState(0)
  const [expirationMinutes, setExpirationMinutes] = useState(0)

  // UI state
  const [isDetailedViewExpanded, setIsDetailedViewExpanded] = useState(false)

  return {
    requestedAdjustment,
    setRequestedAdjustment,
    offeredAdjustment,
    setOfferedAdjustment,
    manuallyEdited,
    setManuallyEdited,
    baseAmounts,
    setBaseAmounts,
    expirationEnabled,
    setExpirationEnabled,
    expirationDays,
    setExpirationDays,
    expirationHours,
    setExpirationHours,
    expirationMinutes,
    setExpirationMinutes,
    isDetailedViewExpanded,
    setIsDetailedViewExpanded,
  }
}
