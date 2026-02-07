'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSignClient } from './useSignClient'
import { useWalletSession } from './useWalletSession'
import { logger } from '@/shared/lib/logger'

const HEALTH_CHECK_INTERVAL = 30_000
const PING_TIMEOUT = 15_000

/**
 * Monitors wallet connection health. Shows "connection lost" only after 2 consecutive
 * failed pings so transient blips (suspend, relay lag) don't trigger the modal.
 */
export function useWalletConnectionHealthCheck() {
  const { signClient } = useSignClient()
  const session = useWalletSession()
  const [connectionLost, setConnectionLost] = useState(false)
  const isCheckingRef = useRef(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const failCountRef = useRef(0)

  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (!signClient || !session.isConnected || !session.topic) return true
    if (isCheckingRef.current) return true
    isCheckingRef.current = true
    try {
      const activeSessions = signClient.session.getAll()
      const activeSession = activeSessions.find((s) => s.topic === session.topic)
      if (!activeSession) {
        logger.warn('Wallet health check: session no longer exists locally')
        return false
      }
      const pingPromise = signClient.ping({ topic: session.topic })
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Ping timeout')), PING_TIMEOUT),
      )
      await Promise.race([pingPromise, timeoutPromise])
      return true
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      const isSessionError =
        msg.includes('No matching key') ||
        msg.includes('Missing or invalid') ||
        msg.includes('session') ||
        msg.includes('Ping timeout')
      if (isSessionError) logger.warn(`Wallet health check failed: ${msg}`)
      return !isSessionError
    } finally {
      isCheckingRef.current = false
    }
  }, [signClient, session.isConnected, session.topic])

  const runHealthCheck = useCallback(async () => {
    if (!session.isConnected) return
    const ok = await checkConnection()
    if (ok) {
      failCountRef.current = 0
    } else {
      failCountRef.current += 1
      if (failCountRef.current >= 2) setConnectionLost(true)
    }
  }, [checkConnection, session.isConnected])

  useEffect(() => {
    if (!session.isConnected) {
      setConnectionLost(false)
      failCountRef.current = 0
    }
  }, [session.isConnected])

  useEffect(() => {
    if (!session.isConnected) return
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setTimeout(runHealthCheck, 2000)
      }
    }
    const onOnline = () => setTimeout(runHealthCheck, 3000)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [session.isConnected, runHealthCheck])

  useEffect(() => {
    if (!session.isConnected) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
      return
    }
    intervalRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') runHealthCheck()
    }, HEALTH_CHECK_INTERVAL)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [session.isConnected, runHealthCheck])

  return { connectionLost }
}
