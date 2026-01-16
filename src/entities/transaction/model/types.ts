/**
 * Transaction entity types
 */

export interface Transaction {
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

export type TransactionStatus = Transaction['status']
export type TransactionType = Transaction['type']
