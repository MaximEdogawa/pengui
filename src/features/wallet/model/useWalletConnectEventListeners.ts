'use client'

import { logger } from '@/shared/lib/logger'
import type SignClient from '@walletconnect/sign-client'
import { useEffect } from 'react'

// Use a WeakMap to track SignClient instances that have listeners registered
// This persists across page refreshes better than a regular Map
const listenerRegistry = new WeakMap<SignClient, Set<string>>()

type EventHandlers = {
  session_delete: (args: unknown) => void
  session_expire: (args: unknown) => void
  session_request: (args: unknown) => void
  session_proposal: (args: unknown) => void
  session_update: (args: unknown) => void
  session_ping: (args: unknown) => void
}

/**
 * Register WalletConnect event listeners immediately (synchronous)
 * This function can be called directly to register listeners without waiting for React effects
 * Used to prevent race conditions where WalletConnect emits events before useEffect runs
 */
export function registerWalletConnectListeners(signClient: SignClient | undefined): void {
  if (!signClient) {
    return
  }

  const clientId = signClient.core.crypto.keychain.keychain.get('clientId') || 'unknown'
  const registeredEvents = listenerRegistry.get(signClient) || new Set()

  const eventNames: Array<keyof EventHandlers> = [
    'session_delete',
    'session_expire',
    'session_request',
    'session_proposal',
    'session_update',
    'session_ping',
  ]

  // Check if listeners are already registered
  const needsRegistration = registeredEvents.size === 0 || 
    !eventNames.every(eventName => registeredEvents.has(eventName))

  if (!needsRegistration) {
    logger.debug(`♻️ Event listeners already registered for client ${clientId}, skipping...`)
    return
  }

  // Create event handlers
  const eventHandlers: EventHandlers = {
    session_delete: () => {
      logger.info('🗑️ WalletConnect session deleted')
    },
    session_expire: () => {
      logger.info('⏰ WalletConnect session expired')
    },
    session_request: (args: unknown) => {
      try {
        const event = args as { topic: string; id: number }
        signClient.respond({
          topic: event.topic,
          response: {
            id: event.id,
            jsonrpc: '2.0',
            result: { acknowledged: true },
          },
        })
        logger.info(`✅ Responded to session request ${event.id} for topic ${event.topic}`)
      } catch (error) {
        logger.warn(
          '⚠️ Failed to respond to session request:',
          error instanceof Error ? error : undefined
        )
      }
    },
    session_proposal: (args: unknown) => {
      logger.info('📋 WalletConnect session proposal received:', args)
    },
    session_update: (args: unknown) => {
      logger.info('🔄 WalletConnect session updated:', args)
    },
    session_ping: (args: unknown) => {
      try {
        const event = args as { topic: string; id?: number }
        // Respond to ping to acknowledge it
        if (event.id !== undefined) {
          signClient.respond({
            topic: event.topic,
            response: {
              id: event.id,
              jsonrpc: '2.0',
              result: { acknowledged: true },
            },
          })
        }
        logger.debug('🏓 WalletConnect session ping received and acknowledged')
      } catch (error) {
        // Suppress "No matching key" errors - these are non-critical and happen during session cleanup
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (errorMessage.includes('No matching key')) {
          logger.debug('🏓 WalletConnect session ping received (session already cleaned up)')
        } else {
          logger.debug('🏓 WalletConnect session ping received (no response needed)', error)
        }
      }
    },
  }

  // Register all event handlers
  Object.entries(eventHandlers).forEach(([eventName, handler]) => {
    signClient.on(eventName as keyof EventHandlers, handler)
    registeredEvents.add(eventName)
  })

  listenerRegistry.set(signClient, registeredEvents)
  logger.info(`✅ WalletConnect event listeners registered immediately for client ${clientId}`)
}

/**
 * Hook to manage WalletConnect event listeners
 * Registers event listeners when SignClient is available
 * Re-registers listeners after page refresh to handle session pings
 * 
 * NOTE: This hook now primarily serves as a backup registration mechanism.
 * The main registration happens synchronously in useSignClient to prevent race conditions.
 */
export function useWalletConnectEventListeners(signClient: SignClient | undefined) {
  useEffect(() => {
    if (!signClient) {
      return
    }

    // Use the synchronous registration function as backup
    // This ensures listeners are registered even if they weren't registered during initialization
    registerWalletConnectListeners(signClient)

    const clientId = signClient.core.crypto.keychain.keychain.get('clientId') || 'unknown'

    // Handle pending session requests
    const handlePendingSessionRequests = async () => {
      try {
        const sessions = signClient.session.getAll()
        logger.info(`🔍 Found ${sessions.length} active sessions`)

        for (const session of sessions) {
          try {
            await signClient.ping({ topic: session.topic })
            logger.info(`✅ Session ${session.topic} is active`)
          } catch (error) {
            // Suppress "No matching key" errors - these are non-critical
            const errorMessage = error instanceof Error ? error.message : String(error)
            if (errorMessage.includes('No matching key')) {
              logger.debug(`🔍 Session ${session.topic} record not found (likely cleaned up)`)
            } else {
              logger.info(`❌ Session ${session.topic} is not responding`)
            }
          }
        }
      } catch (error) {
        // Suppress "No matching key" errors in the outer catch as well
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (!errorMessage.includes('No matching key')) {
          logger.warn(
            '⚠️ Error handling pending session requests:',
            error instanceof Error ? error : undefined
          )
        }
      }
    }

    handlePendingSessionRequests()

    // Cleanup function
    // NOTE: We intentionally do NOT remove listeners here because:
    // 1. Listeners are shared across all components using the SignClient
    // 2. Removing listeners during component unmount can cause "no listeners" errors
    //    when WalletConnect emits session_ping during active wallet operations
    // 3. Listeners should persist for the lifetime of the SignClient instance
    // The listeners will be cleaned up when the SignClient is destroyed/recreated
    return () => {
      logger.debug(`Component using WalletConnect listeners unmounted for client ${clientId}, but keeping listeners active`)
    }
  }, [signClient])
}
