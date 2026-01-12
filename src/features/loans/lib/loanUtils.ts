import type { LoanOffer } from '@/entities/loan'

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  // Map Chia currencies to valid ISO 4217 codes or use number formatting
  let currencyCode = 'USD'
  if (
    currency === 'b.USDC' ||
    currency === 'b.USDT' ||
    currency === 'USDC' ||
    currency === 'USDT'
  ) {
    currencyCode = 'USD'
  } else if (currency === 'XCH' || currency === 'CHIA') {
    // XCH doesn't have an ISO code, so we'll format as number with XCH suffix
    return `${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)} XCH`
  } else {
    // Try to use the currency code as-is, fallback to USD if invalid
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount)
    } catch {
      // If currency code is invalid, format as number with currency suffix
      return `${new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount)} ${currency}`
    }
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function calculateTotalInterest(
  principal: number,
  interestRate: number,
  duration: number
): number {
  // Simple interest calculation: principal * rate * (duration/12)
  return principal * (interestRate / 100) * (duration / 12)
}

export function calculateTotalRepayment(
  principal: number,
  interestRate: number,
  duration: number
): number {
  return principal + calculateTotalInterest(principal, interestRate, duration)
}

export function calculateMonthlyPayment(
  principal: number,
  interestRate: number,
  duration: number
): number {
  // Monthly payment using amortization formula
  const monthlyRate = interestRate / 100 / 12
  const numPayments = duration
  if (monthlyRate === 0) {
    return principal / numPayments
  }
  return (
    (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1)
  )
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  // Check if date is valid
  if (Number.isNaN(date.getTime())) {
    return 'Invalid Date'
  }
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function getDaysUntil(dateString: string): number {
  const date = new Date(dateString)
  // Check if date is valid
  if (Number.isNaN(date.getTime())) {
    return 0
  }
  const today = new Date()
  const diffTime = date.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

export function getLoanAssetDisplay(loan: LoanOffer): string {
  if (loan.assetType === 'CAT') {
    return `${formatCurrency(loan.amount, loan.currency)} ${loan.currency}`
  } else if (loan.assetType === 'NFT') {
    return `${loan.nftCollection || 'NFT'} ${loan.nftTokenId || ''}`
  } else if (loan.assetType === 'Options') {
    return `${loan.optionQuantity || 0}x ${loan.optionUnderlying || ''} ${loan.optionContractType || 'Call'} @ ${loan.optionStrike || 0}`
  }
  return `${loan.amount} ${loan.currency}`
}

export function getCollateralDisplay(loan: LoanOffer): string {
  if (loan.collateralAssetType === 'CAT' || loan.collateralAssetType === 'XCH') {
    return `${loan.collateralType}`
  } else if (loan.collateralAssetType === 'NFT') {
    return `${loan.collateralNftCollection || 'NFT'} Collection`
  } else if (loan.collateralAssetType === 'Options') {
    return `${loan.collateralOptionUnderlying || ''} ${loan.collateralOptionType || 'Call'} Options`
  }
  return loan.collateralType
}

export function getRiskLabel(collateralRatio: number): string {
  if (collateralRatio < 130) return 'High Risk'
  if (collateralRatio < 170) return 'Medium Risk'
  return 'Low Risk'
}

export function getRiskColor(collateralRatio: number, isDark: boolean): string {
  if (collateralRatio < 130) {
    return isDark ? 'bg-red-500/20 border-red-500/30' : 'bg-red-100 border-red-300'
  }
  if (collateralRatio < 170) {
    return isDark ? 'bg-yellow-500/20 border-yellow-500/30' : 'bg-yellow-100 border-yellow-300'
  }
  return isDark ? 'bg-green-500/20 border-green-500/30' : 'bg-green-100 border-green-300'
}
