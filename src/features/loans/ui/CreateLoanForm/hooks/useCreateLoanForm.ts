import { useState } from 'react'
import type { CreateLoanForm } from '@/entities/loan'

export function useCreateLoanForm() {
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

  const [interestRateValue, setInterestRateValue] = useState(8.0)

  const updateFormData = (updates: Partial<CreateLoanForm>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }

  const updateInterestRate = (value: number) => {
    if (!Number.isNaN(value)) {
      setInterestRateValue(value)
      updateFormData({ interestRate: value.toFixed(1) })
    }
  }

  return {
    formData,
    interestRateValue,
    updateFormData,
    updateInterestRate,
  }
}
