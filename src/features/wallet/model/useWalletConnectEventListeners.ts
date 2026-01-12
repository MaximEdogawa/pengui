'use client'

import { logger } from '@/shared/lib/logger'
import type SignClient from '@walletconnect/sign-client'
import { useEffect } from 'react'

const listenerRegistry = new Map<string, Set<string>>()

type EventHandlers = {
  session_delete: (args: unknown) => void
  session_expire: (args: unknown) => void
  session_request: (args: unknown) => void
  session_proposal: (args: unknown) => void
  session_update: (args: unknown) => void
  session_ping: (args: unknown) => void
}

/**
 * Hook to manage WalletConnect event listeners
 * Registers event listeners when SignClient is available
 */
export function useWalletConnectEventListeners(signClient: SignClient | undefined) {
  useEffect(() => {
    if (!signClient) {
      return
    }

    const clientId = signClient.core.crypto.keychain.keychain.get('clientId') || 'unknown'
    const registeredEvents = listenerRegistry.get(clientId) || new Set()

    if (registeredEvents.size > 0) {
      logger.info(`♻️ Event listeners already registered for client ${clientId}, skipping...`)
      return
    }

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

    Object.entries(eventHandlers).forEach(([eventName, handler]) => {
      signClient.on(eventName as keyof EventHandlers, handler)
      registeredEvents.add(eventName)
    })

    listenerRegistry.set(clientId, registeredEvents)

    logger.info(`✅ WalletConnect event listeners registered successfully for client ${clientId}`)

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
    return () => {
      try {
        logger.info(`🧹 Removing WalletConnect event listeners for client ${clientId}...`)
        registeredEvents.forEach((eventName) => {
          signClient.removeAllListeners(eventName as keyof EventHandlers)
        })
        listenerRegistry.delete(clientId)
        logger.info(`✅ WalletConnect event listeners removed for client ${clientId}`)
      } catch (error) {
        logger.warn(
          '⚠️ Error removing event listeners:',
          error instanceof Error ? error : undefined
        )
      }
    }
  }, [signClient])
}
