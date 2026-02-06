'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSignClient } from './useSignClient'
import { useWalletSession } from './useWalletSession'
import { logger } from '@/shared/lib/logger'

/** How often to run a health check while the tab is visible (ms) */
const HEALTH_CHECK_INTERVAL = 30_000
/** How long to wait for a ping response before considering the session dead (ms) */
const PING_TIMEOUT = 10_000

/**
 * Hook that monitors the wallet connection health.
 *
 * It detects stale / broken WalletConnect sessions that can occur when:
 * - The OS suspends the PC and the relay WebSocket drops
 * - The Sage wallet process freezes or crashes
 * - The WalletConnect relay becomes unreachable
 *
 * Detection is triggered by:
 * 1. The `visibilitychange` event (user returns to the tab after suspension)
 * 2. The `online` event (network comes back)
 * 3. A periodic interval while the page is visible
 *
 * When an unhealthy connection is detected `connectionLost` becomes `true`.
 */
export function useWalletConnectionHealthCheck() {
  const { signClient } = useSignClient()
  const session = useWalletSession()
  const [connectionLost, setConnectionLost] = useState(false)
  const isCheckingRef = useRef(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Attempt to ping the current session.
   * Returns `true` when the session is healthy, `false` otherwise.
   */
  const checkConnection = useCallback(async (): Promise<boolean> => {
    // Nothing to check if there's no active session
    if (!signClient || !session.isConnected || !session.topic) {
      return true // not connected – nothing to flag
    }

    // Prevent overlapping checks
    if (isCheckingRef.current) return true
    isCheckingRef.current = true

    try {
      // First: verify the session still exists locally
      const activeSessions = signClient.session.getAll()
      const activeSession = activeSessions.find(
        (s) => s.topic === session.topic,
      )
      if (!activeSession) {
        logger.warn('Wallet health check: session no longer exists locally')
        return false
      }

      // Second: try to ping the remote wallet through the relay
      const pingPromise = signClient.ping({ topic: session.topic })
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Ping timeout')),
          PING_TIMEOUT,
        ),
      )

      await Promise.race([pingPromise, timeoutPromise])
      return true
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      // "No matching key" means the session was already cleaned up
      if (
        msg.includes('No matching key') ||
        msg.includes('Missing or invalid') ||
        msg.includes('session') ||
        msg.includes('Ping timeout')
      ) {
        logger.warn(`Wallet health check failed: ${msg}`)
        return false
      }
      // For other transient errors don't flag as lost right away
      logger.debug('Wallet health check transient error:', msg)
      return true
    } finally {
      isCheckingRef.current = false
    }
  }, [signClient, session.isConnected, session.topic])

  /**
   * Run the health check and update state accordingly.
   */
  const runHealthCheck = useCallback(async () => {
    if (!session.isConnected) return
    const healthy = await checkConnection()
    if (!healthy) {
      setConnectionLost(true)
    }
  }, [checkConnection, session.isConnected])

  // Reset `connectionLost` when the session becomes disconnected (e.g. user
  // confirmed the modal and we cleared the state).
  useEffect(() => {
    if (!session.isConnected) {
      setConnectionLost(false)
    }
  }, [session.isConnected])

  // ── Visibility change listener ──────────────────────────────────────
  useEffect(() => {
    if (!session.isConnected) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Small delay so the relay WebSocket has time to reconnect
        setTimeout(() => {
          runHealthCheck()
        }, 2000)
      }
    }

    const handleOnline = () => {
      setTimeout(() => {
        runHealthCheck()
      }, 3000)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
    }
  }, [session.isConnected, runHealthCheck])

  // ── Periodic interval ───────────────────────────────────────────────
  useEffect(() => {
    if (!session.isConnected) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(() => {
      // Only check while the tab is visible to avoid wasting resources
      if (document.visibilityState === 'visible') {
        runHealthCheck()
      }
    }, HEALTH_CHECK_INTERVAL)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [session.isConnected, runHealthCheck])

  return { connectionLost }
}
