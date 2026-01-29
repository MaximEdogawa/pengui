/**
 * Transaction formatting utilities
 */

import type { Transaction } from './types'
import { formatAddress } from '@/shared/lib/web3/address'
import { formatRelativeTime } from '@/shared/lib/formatting/date'
import { formatAmountFromMojos } from '@/shared/lib/formatting/amount'

export function formatTransactionAddress(transaction: Transaction): string {
  const address = transaction.recipientAddress || transaction.senderAddress || ''
  return formatAddress(address)
}

export function formatTransactionTime(transaction: Transaction): string {
  return formatRelativeTime(transaction.timestamp)
}

export function formatTransactionAmount(transaction: Transaction): string {
  return formatAmountFromMojos(transaction.amount)
}
