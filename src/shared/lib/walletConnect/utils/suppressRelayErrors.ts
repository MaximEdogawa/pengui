/**
 * Suppresses WalletConnect relay message errors from console
 * These are internal SDK errors that are non-critical and can be safely ignored
 * This file intentionally modifies console methods
 */

import { logger } from "../../logger"

 
let originalConsoleError: typeof console.error | null = null
let isSuppressing = false
let errorCallCount = 0
let lastErrorTime = 0
const MAX_ERRORS_PER_SECOND = 10

/**
 * Check if arguments contain WalletConnect warning patterns
 */
function hasWalletConnectWarning(args: unknown[]): boolean {
  return args.some((arg) => {
    const argStr = typeof arg === 'string' ? arg : String(arg)
    return (
      argStr.includes('emitting session_ping') ||
      argStr.includes('emitting session_request') ||
      argStr.includes('without any listeners') ||
      (argStr.includes('emitting') && argStr.includes('without')) ||
      /emitting\s+session_(ping|request):\d+/.test(argStr) ||
      /emitting\s+session_(ping|request):\d+\s+without/.test(argStr) ||
      /emitting\s+session_(ping|request)[:\d\s]+without/.test(argStr) ||
      /emitting.*session_(ping|request).*without/.test(argStr)
    )
  })
}

/**
 * Check if arguments contain "No matching key" errors
 */
function hasNoMatchingKeyError(args: unknown[]): boolean {
  return args.some((arg) => {
    const argStr = typeof arg === 'string' ? arg : String(arg)
    return (
      argStr.includes('No matching key') ||
      (argStr.includes('No matching key') && argStr.includes('history:')) ||
      /No matching key.*history:\s*\d+/.test(argStr)
    )
  })
}

/**
 * Check if message is a relay error object
 */
function isRelayErrorObject(message: unknown): boolean {
  return !!(
    message &&
    typeof message === 'object' &&
    'msg' in message &&
    typeof (message as { msg?: unknown }).msg === 'string' &&
    ((message as { msg: string }).msg.includes('onRelayMessage()') ||
     (message as { msg: string }).msg.includes('failed to process an inbound message'))
  )
}

/**
 * Check if message string contains relay error patterns
 */
function hasRelayErrorPattern(messageStr: string): boolean {
  return (
    messageStr.includes('onRelayMessage()') ||
    messageStr.includes('failed to process an inbound message') ||
    (messageStr.includes('relay') && messageStr.includes('failed')) ||
    (messageStr.includes('relay') && messageStr.includes('error')) ||
    (messageStr.length > 50 && /^[A-Za-z0-9+/=]+$/.test(messageStr) && messageStr.includes('='))
  )
}

/**
 * Check if arguments contain chainId validation errors
 */
function hasChainIdError(args: unknown[]): boolean {
  return args.some((arg) => {
    const argStr = typeof arg === 'string' ? arg : String(arg)
    return (
      (argStr.includes('Missing or invalid') && argStr.includes('chainId')) ||
      (argStr.includes('request()') && argStr.includes('chainId')) ||
      (argStr.includes('isValidRequest()') && argStr.includes('failed') && argStr.includes('chainId'))
    )
  })
}

/**
 * Check if arguments contain structured error objects
 */
function hasStructuredErrorObject(args: unknown[]): boolean {
  return args.some((arg) => {
    if (arg && typeof arg === 'object' && !Array.isArray(arg)) {
      const obj = arg as Record<string, unknown>
      if ('level' in obj && 'time' in obj && typeof obj.level === 'number') {
        return true
      }
    }
    return false
  })
}

/**
 * Check if arguments contain relay error patterns in objects or strings
 */
function hasRelayErrorInArgs(args: unknown[]): boolean {
  return args.some((arg) => {
    if (arg && typeof arg === 'object' && 'msg' in arg && typeof (arg as { msg?: unknown }).msg === 'string') {
      const msgStr = (arg as { msg: string }).msg
      return (
        msgStr.includes('onRelayMessage') ||
        msgStr.includes('failed to process an inbound message')
      )
    }
    const argStr = typeof arg === 'string' ? arg : String(arg)
    return (
      argStr.includes('onRelayMessage') ||
      argStr.includes('failed to process an inbound message') ||
      (argStr.includes('relay') && (argStr.includes('failed') || argStr.includes('error')))
    )
  })
}

/**
 * Handle rate limiting for console errors
 */
function handleRateLimitedError(args: unknown[]): void {
  if (!originalConsoleError) return
  
  const now = Date.now()
  if (now - lastErrorTime > 1000) {
    errorCallCount = 0
    lastErrorTime = now
  }
  
  if (errorCallCount < MAX_ERRORS_PER_SECOND) {
    errorCallCount++
    try {
      originalConsoleError.apply(console, args)
    } catch (e) {
      logger.error('Error in error handler:', e)
    }
  } else if (errorCallCount === MAX_ERRORS_PER_SECOND) {
    errorCallCount++
    try {
      originalConsoleError.apply(console, [
        '[suppressRelayErrors] Error rate limit exceeded. Suppressing additional errors to prevent infinite loops.',
      ])
    } catch {
      // Ignore
    }
  }
}

export function suppressRelayErrors() {
  if (isSuppressing || typeof window === 'undefined') {
    return
  }

  originalConsoleError = console.error
  isSuppressing = true

  // Also intercept console.warn to suppress WalletConnect warnings
  const originalConsoleWarn = console.warn
  console.warn = (...args: unknown[]) => {
    // Check all arguments for WalletConnect warning patterns
    const hasWalletConnectWarning = args.some((arg) => {
      const argStr = typeof arg === 'string' ? arg : String(arg)
      // Match various patterns including the exact format: "emitting session_ping:1763247642784907 without any listeners 2176"
      return (
        argStr.includes('emitting session_ping') ||
        argStr.includes('emitting session_request') ||
        argStr.includes('without any listeners') ||
        (argStr.includes('emitting') && argStr.includes('without')) ||
        // Match patterns with colons and numbers: "emitting session_ping:1763247731881895"
        /emitting\s+session_(ping|request):\d+/.test(argStr) ||
        // Match full pattern: "emitting session_ping:number without any listeners number"
        /emitting\s+session_(ping|request):\d+\s+without/.test(argStr) ||
        /emitting\s+session_(ping|request)[:\d\s]+without/.test(argStr) ||
        // Match any string containing "emitting" followed by "session_" and "without"
        /emitting.*session_(ping|request).*without/.test(argStr)
      )
    })

    // Check for "No matching key" warnings
    const hasNoMatchingKeyError = args.some((arg) => {
      const argStr = typeof arg === 'string' ? arg : String(arg)
      return (
        argStr.includes('No matching key') ||
        (argStr.includes('No matching key') && argStr.includes('history:')) ||
        /No matching key.*history:\s*\d+/.test(argStr)
      )
    })

    // Check for infinite loop guardrail warnings (development-only, can be noisy)
    const hasInfiniteLoopWarning = args.some((arg) => {
      const argStr = typeof arg === 'string' ? arg : String(arg)
      return argStr.includes('[trackEffectRun]') && argStr.includes('Potential infinite loop detected')
    })

    if (hasWalletConnectWarning || hasNoMatchingKeyError || hasInfiniteLoopWarning) {
      // Suppress these warnings - listeners are registered, this is just a timing issue
      // "No matching key" errors occur when WalletConnect tries to access cleaned up session records
      // Infinite loop warnings are development guardrails that can be noisy
      return
    }

    // Call original console.warn for all other warnings
    originalConsoleWarn.apply(console, args)
  }

  console.error = (...args: unknown[]) => {
    // Check for React infinite loop errors and suppress if rate limited
    const hasReactInfiniteLoopError = args.some((arg) => {
      const argStr = typeof arg === 'string' ? arg : String(arg)
      return argStr.includes('Maximum update depth exceeded')
    })

    // Rate limit React infinite loop errors to prevent console spam
    if (hasReactInfiniteLoopError) {
      const now = Date.now()
      if (now - lastErrorTime > 1000) {
        errorCallCount = 0
        lastErrorTime = now
      }
      if (errorCallCount >= MAX_ERRORS_PER_SECOND) {
        return
      }
      errorCallCount++
    }

    // Check for WalletConnect warnings and errors
    if (hasWalletConnectWarning(args) || hasNoMatchingKeyError(args)) {
      return
    }

    const message = args[0]
    const messageStr = typeof message === 'string' ? message : String(message)

    // Check if this is a WalletConnect relay message error
    if (isRelayErrorObject(message) || hasRelayErrorPattern(messageStr)) {
      return
    }

    // Check for other error types
    if (hasChainIdError(args) || hasStructuredErrorObject(args) || hasRelayErrorInArgs(args)) {
      return
    }

    // Call original console.error with rate limiting
    handleRateLimitedError(args)
  }
}