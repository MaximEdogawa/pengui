/**
 * Error handling utilities for wallet requests
 * Extracted from makeWalletRequest to reduce complexity and improve maintainability
 */

import { logger } from '@/shared/lib/logger'

interface ExtractedError {
  message: string
  code?: number
}

/**
 * Extract error message and code from various error formats
 */
export function extractErrorInfo(error: unknown): ExtractedError {
  let errorMessage = 'Unknown error'
  let errorCode: number | undefined

  if (error && typeof error === 'object') {
    // Handle WalletConnect error format: {code: number, message: string}
    if ('message' in error && typeof error.message === 'string') {
      errorMessage = error.message
    }
    if ('code' in error && typeof error.code === 'number') {
      errorCode = error.code
    }
  } else if (error instanceof Error) {
    errorMessage = error.message
  } else if (typeof error === 'string') {
    errorMessage = error
  }

  return { message: errorMessage, code: errorCode }
}

/**
 * Handle error code 4001 (user rejection or request failure)
 */
export function handleErrorCode4001(errorMessage: string): { success: false; error: string } | null {
  const lowerMessage = errorMessage.toLowerCase()
  const isUserRejection =
    lowerMessage.includes('rejected') ||
    lowerMessage.includes('denied') ||
    lowerMessage.includes('cancelled')

  if (isUserRejection) {
    logger.info('User rejected the wallet request (code 4001)')
    return { success: false, error: 'Request was cancelled in wallet' }
  }

  // Request failed for another reason
  logger.warn(`Wallet request failed (code 4001): ${errorMessage}`)
  return {
    success: false,
    error:
      errorMessage ||
      'The wallet could not process the cancel request. The offer may not exist or may already be cancelled.',
  }
}

/**
 * Check if error indicates user rejection
 */
export function isUserRejection(errorMessage: string): boolean {
  return (
    errorMessage.includes('User rejected') ||
    errorMessage.includes('User denied') ||
    errorMessage.includes('rejected') ||
    errorMessage.includes('denied')
  )
}

/**
 * Check if error is a relay message error (non-critical)
 */
export function isRelayError(errorMessage: string): boolean {
  return (
    errorMessage.includes('onRelayMessage') ||
    errorMessage.includes('failed to process an inbound message') ||
    errorMessage.includes('relay')
  )
}

/**
 * Check if error is a session ping error (non-critical)
 */
export function isSessionPingError(errorMessage: string): boolean {
  return errorMessage.includes('session_ping') || errorMessage.includes('without any listeners')
}

/**
 * Check if error indicates session was deleted
 */
export function isSessionDeletedError(errorMessage: string): boolean {
  return errorMessage.includes('Missing or invalid') || errorMessage.includes('recently deleted')
}

/**
 * Handle wallet request error and return appropriate response
 */
export function handleWalletRequestError(
  error: unknown,
  method: string
): { success: false; error: string } {
  const { message: errorMessage, code: errorCode } = extractErrorInfo(error)

  // Handle specific error codes
  if (errorCode === 4001) {
    const result = handleErrorCode4001(errorMessage)
    if (result) return result
  }

  // Handle user rejection by message
  if (isUserRejection(errorMessage)) {
    logger.info('User rejected the wallet request')
    return { success: false, error: 'Request was cancelled in wallet' }
  }

  // Handle relay message errors (often non-critical)
  if (isRelayError(errorMessage)) {
    logger.warn('⚠️ WalletConnect relay message error (non-critical):', errorMessage)
    return { success: false, error: 'Relay communication error. Please try again.' }
  }

  // Handle session_ping errors (non-critical WalletConnect internal warnings)
  if (isSessionPingError(errorMessage)) {
    logger.warn('⚠️ WalletConnect session_ping warning (non-critical):', errorMessage)
    // Continue to return generic error below
  }

  // Handle session deletion
  if (isSessionDeletedError(errorMessage)) {
    logger.warn('🗑️ Session was deleted')
    return { success: false, error: 'Wallet session expired. Please reconnect your wallet.' }
  }

  // Log the full error for debugging
  logger.error(`Error in wallet request for ${method}:`, error)

  // Return user-friendly error message
  if (errorCode !== undefined) {
    return { success: false, error: errorMessage || `Wallet error (code ${errorCode})` }
  }

  return { success: false, error: errorMessage }
}
