/**
 * Suppresses WalletConnect relay message errors from console
 * These are internal SDK errors that are non-critical and can be safely ignored
 */

/* eslint-disable no-console */
let originalConsoleError: typeof console.error | null = null
let isSuppressing = false

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

    if (hasWalletConnectWarning || hasNoMatchingKeyError) {
      // Suppress these warnings - listeners are registered, this is just a timing issue
      // "No matching key" errors occur when WalletConnect tries to access cleaned up session records
      return
    }

    // Call original console.warn for all other warnings
    originalConsoleWarn.apply(console, args)
  }

  console.error = (...args: unknown[]) => {
    // First check for WalletConnect "emitting without listeners" warnings (sometimes logged as errors)
    const hasWalletConnectWarning = args.some((arg) => {
      const argStr = typeof arg === 'string' ? arg : String(arg)
      // Match various patterns including the exact format: "emitting session_ping:1763247731881895 without any listeners 2176"
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
        /emitting.*session_(ping|request).*without/.test(argStr)
      )
    })

    // Check for "No matching key" errors - these occur when WalletConnect tries to access session records that have been cleaned up
    const hasNoMatchingKeyError = args.some((arg) => {
      const argStr = typeof arg === 'string' ? arg : String(arg)
      return (
        argStr.includes('No matching key') ||
        (argStr.includes('No matching key') && argStr.includes('history:')) ||
        /No matching key.*history:\s*\d+/.test(argStr)
      )
    })

    if (hasWalletConnectWarning || hasNoMatchingKeyError) {
      // Suppress these warnings - listeners are registered, this is just a timing issue
      // "No matching key" errors occur when WalletConnect tries to access cleaned up session records
      return
    }

    const message = args[0]
    const messageStr = typeof message === 'string' ? message : String(message)

    // Check if this is a WalletConnect relay message error
    // These errors often contain base64-encoded data and specific error patterns
    if (
      messageStr.includes('onRelayMessage()') ||
      messageStr.includes('failed to process an inbound message') ||
      (messageStr.includes('relay') && messageStr.includes('failed')) ||
      (messageStr.includes('relay') && messageStr.includes('error')) ||
      // Check for base64-like strings (common in relay errors)
      (messageStr.length > 50 && /^[A-Za-z0-9+/=]+$/.test(messageStr) && messageStr.includes('='))
    ) {
      // Suppress these errors - they're non-critical internal SDK errors
      return
    }

    // Also check if any argument contains relay error patterns
    const hasRelayError = args.some((arg) => {
      const argStr = typeof arg === 'string' ? arg : String(arg)
      return (
        argStr.includes('onRelayMessage') ||
        argStr.includes('failed to process an inbound message') ||
        (argStr.includes('relay') && (argStr.includes('failed') || argStr.includes('error')))
      )
    })

    if (hasRelayError) {
      return
    }

    // Call original console.error for all other errors
    if (originalConsoleError) {
      originalConsoleError.apply(console, args)
    }
  }
}

// Note: restoreConsoleError is intentionally not exported as we want suppression to persist
// throughout the app lifecycle. If needed for testing, it can be exported.
