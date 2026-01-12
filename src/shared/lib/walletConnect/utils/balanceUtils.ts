/**
 * Utility functions for formatting and converting balance values
 */

const MOJOS_PER_XCH = 1_000_000_000_000

export function formatBalanceFromMojos(mojos: string | number | bigint | undefined): string {
  if (!mojos) return '0.000000'
  const mojosBigInt = typeof mojos === 'bigint' ? mojos : BigInt(mojos)
  const xch = Number(mojosBigInt) / MOJOS_PER_XCH
  return xch.toFixed(6)
}

export function formatSpendableBalance(
  balance: { spendable?: string | number } | null | undefined
): string {
  if (!balance?.spendable) return '0.000000'
  return formatBalanceFromMojos(balance.spendable)
}

export function formatConfirmedBalance(
  balance: { confirmed?: string | number } | null | undefined
): string {
  if (!balance?.confirmed) return '0.000000'
  return formatBalanceFromMojos(balance.confirmed)
}
