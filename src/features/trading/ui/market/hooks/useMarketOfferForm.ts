'use client'

import { assetInputAmounts, getMinimumFeeInXch } from '@/shared/lib/utils/chia-units'
import { useCallback, useState } from 'react'

export function useMarketOfferForm() {
  const [offerString, setOfferString] = useState('')
  const [fee, setFee] = useState(getMinimumFeeInXch())
  const [feeInput, setFeeInput] = useState<string | undefined>(undefined)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const handleFeeChange = useCallback((value: string) => {
    if (assetInputAmounts.isValid(value, 'xch')) {
      setFeeInput(value)
      const parsed = assetInputAmounts.parse(value, 'xch')
      setFee(parsed)
    }
  }, [])

  const handleFeeBlur = useCallback(() => {
    const parsed = assetInputAmounts.parse(
      feeInput !== undefined ? feeInput : fee?.toString() || '',
      'xch'
    )
    setFee(parsed >= 0 ? parsed : getMinimumFeeInXch())
    setFeeInput(undefined)
  }, [feeInput, fee])

  const resetForm = useCallback(() => {
    setOfferString('')
    setFee(getMinimumFeeInXch())
    setFeeInput(undefined)
    setErrorMessage('')
    setSuccessMessage('')
  }, [])

  return {
    offerString,
    setOfferString,
    fee,
    setFee,
    feeInput,
    setFeeInput,
    isSubmitting,
    setIsSubmitting,
    errorMessage,
    setErrorMessage,
    successMessage,
    setSuccessMessage,
    handleFeeChange,
    handleFeeBlur,
    resetForm,
  }
}
