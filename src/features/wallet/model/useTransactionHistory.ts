'use client'

import { getTransactions } from '@/shared/lib/walletConnect/utils/transactionStorage'
import type { StoredTransaction } from '@/shared/lib/walletConnect/utils/transactionStorage'
import { useEffect, useState } from 'react'

/**
 * Hook to manage transaction history from localStorage
 * Automatically updates when transactions are saved
 */
export function useTransactionHistory() {
  const [transactions, setTransactions] = useState<StoredTransaction[]>([])

  useEffect(() => {
    const loadTransactions = () => {
      setTransactions(getTransactions())
    }

    loadTransactions()

    // Listen for storage changes (from other tabs/windows)
    const handleStorageChange = () => {
      loadTransactions()
    }

    // Listen for custom transaction events (from same window)
    const handleTransactionEvent = () => {
      loadTransactions()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('transactionSaved', handleTransactionEvent)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('transactionSaved', handleTransactionEvent)
    }
  }, [])

  return transactions
}
