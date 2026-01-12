/**
 * Utility functions for transaction processing
 */

/**
 * Extracts transaction ID from various possible response structures
 */
export function extractTransactionId(result: unknown): string {
  if (!result || typeof result !== 'object') {
    return 'N/A'
  }

  const resultObj = result as Record<string, unknown>

  // Try different possible field names
  if (typeof resultObj.transactionId === 'string') {
    return resultObj.transactionId
  }
  if (typeof resultObj.id === 'string') {
    return resultObj.id
  }
  if (typeof resultObj.transaction_id === 'string') {
    return resultObj.transaction_id
  }
  if (typeof resultObj.txId === 'string') {
    return resultObj.txId
  }

  // Check nested transaction object
  if (resultObj.transaction && typeof resultObj.transaction === 'object') {
    const transaction = resultObj.transaction as Record<string, unknown>
    if (typeof transaction.transactionId === 'string') {
      return transaction.transactionId
    }
    if (typeof transaction.id === 'string') {
      return transaction.id
    }
  }

  // Check if transaction is a string (coin name)
  if (typeof resultObj.transaction === 'string') {
    return resultObj.transaction
  }

  return 'N/A'
}
