/**
 * Utility functions for formatting amounts
 */

import { mojosToXch } from './chia-units'

export function formatAmountFromMojos(amount: string): string {
  try {
    const mojos = BigInt(amount)
    const xch = mojosToXch(Number(mojos))
    return xch.toFixed(6)
  } catch {
    return '0.000000'
  }
}
