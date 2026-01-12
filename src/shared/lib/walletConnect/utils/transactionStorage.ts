/**
 * Local storage utility for transaction history
 * Since wallet doesn't provide transaction history API, we store sent transactions locally
 */

import { logger } from '@/shared/lib/logger'

export interface StoredTransaction {
  id: string
  transactionId: string
  timestamp: number
  type: 'send' | 'receive'
  amount: string
  fee: string
  recipientAddress?: string
  senderAddress?: string
  memo?: string
  status: 'pending' | 'confirmed' | 'failed'
}

const STORAGE_KEY = 'wallet_transactions'
const MAX_TRANSACTIONS = 50

export function saveTransaction(transaction: Omit<StoredTransaction, 'id' | 'timestamp'>): void {
  if (typeof window === 'undefined') return

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const transactions: StoredTransaction[] = stored ? JSON.parse(stored) : []

    const newTransaction: StoredTransaction = {
      ...transaction,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    }

    transactions.unshift(newTransaction) // Add to beginning
    const limited = transactions.slice(0, MAX_TRANSACTIONS) // Keep only recent transactions

    localStorage.setItem(STORAGE_KEY, JSON.stringify(limited))
  } catch (error) {
    logger.error('Failed to save transaction:', error)
  }
}

export function getTransactions(): StoredTransaction[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    logger.error('Failed to get transactions:', error)
    return []
  }
}

export function clearTransactions(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    logger.error('Failed to clear transactions:', error)
  }
}
