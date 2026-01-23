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

  if (error instanceof Error) {
    errorMessage = error.message
    const errorWithCode = error as Error & { code?: number }
    if (typeof errorWithCode.code === 'number') {
      errorCode = errorWithCode.code
    }
  } else if (error && typeof error === 'object' && !(error instanceof Error)) {
    const errorObj = error as Record<string, unknown>
    
    // Check for nested error object
    if ('error' in errorObj && errorObj.error && typeof errorObj.error === 'object') {
      const nestedError = errorObj.error as Record<string, unknown>
      if ('message' in nestedError && typeof nestedError.message === 'string') {
        errorMessage = nestedError.message
      }
      if ('code' in nestedError && typeof nestedError.code === 'number') {
        errorCode = nestedError.code
      }
    }
    
    // Check top-level message
    if ('message' in errorObj && typeof errorObj.message === 'string') {
      errorMessage = errorObj.message
    }
    
    // Check for code
    if ('code' in errorObj && typeof errorObj.code === 'number') {
      errorCode = errorObj.code
    }
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
    lowerMessage.includes('cancelled') ||
    lowerMessage.includes('user rejected') ||
    lowerMessage.includes('user denied')

  if (isUserRejection) {
    logger.info('User rejected the wallet request (code 4001)')
    return { success: false, error: 'Request was cancelled in wallet' }
  }

  // Request failed for another reason - return the actual error message
  logger.warn(`Wallet request failed (code 4001): ${errorMessage}`)
  
  // If error message is generic, provide more context
  if (errorMessage === 'Request failed' || errorMessage === 'Unknown error' || errorMessage.includes('[object Object]')) {
    return {
      success: false,
      error: 'Wallet rejected the request. This may be due to invalid parameters, network mismatch, or the wallet being unable to process the request. Please check the wallet and try again.',
    }
  }
  
  return {
    success: false,
    error: errorMessage || 'The wallet could not process the request. Please check the wallet and try again.',
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

  // Log error for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    logger.error(`Wallet request error for ${method}:`, {
      error: errorMessage,
      code: errorCode,
    })
  }

  // Handle specific error codes
  if (errorCode === 4001) {
    const result = handleErrorCode4001(errorMessage)
    if (result) return result
  }

  // Handle user rejection by message
  if (isUserRejection(errorMessage)) {
    return { success: false, error: 'Request was cancelled in wallet' }
  }

  // Handle relay message errors (often non-critical)
  if (isRelayError(errorMessage)) {
    return { success: false, error: 'Relay communication error. Please try again.' }
  }

  // Handle session_ping errors (non-critical WalletConnect internal warnings)
  if (isSessionPingError(errorMessage)) {
    // Suppress these errors as they're non-critical
    return { success: false, error: 'Connection error. Please try again.' }
  }

  // Handle session deletion
  if (isSessionDeletedError(errorMessage)) {
    return { success: false, error: 'Wallet session expired. Please reconnect your wallet.' }
  }

  // Return user-friendly error message
  if (errorCode !== undefined) {
    return { success: false, error: errorMessage || `Wallet error (code ${errorCode})` }
  }

  return { success: false, error: errorMessage }
}
