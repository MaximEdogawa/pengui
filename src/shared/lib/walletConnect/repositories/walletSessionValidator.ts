/**
 * Session validation utilities for wallet requests
 * Extracted from makeWalletRequest to reduce complexity
 */

import { logger } from '@/shared/lib/logger'
import type { WalletConnectSession } from '../types/walletConnect.types'
import type SignClient from '@walletconnect/sign-client'

export interface SessionValidationResult {
  isValid: boolean
  error?: string
  validChainId?: string
}

/**
 * Validate session connection and existence
 */
export function validateSessionConnection(
  signClient: SignClient | undefined,
  session: WalletConnectSession
): SessionValidationResult {
  if (!signClient) {
    return { isValid: false, error: 'SignClient is not initialized' }
  }

  if (!session.isConnected || !session.session) {
    logger.warn('❌ Session is not connected')
    return { isValid: false, error: 'Session is not connected' }
  }

  const activeSessions = signClient.session.getAll()
  const sessionExists = activeSessions.some((s) => s.topic === session.topic)

  if (!sessionExists) {
    logger.warn(`❌ Session ${session.topic} no longer exists in SignClient`)
    return { isValid: false, error: 'Session no longer exists' }
  }

  const actualSession = activeSessions.find((s) => s.topic === session.topic)
  if (!actualSession) {
    logger.warn(`❌ Could not find session ${session.topic} in SignClient`)
    return { isValid: false, error: 'Session not found' }
  }

  return { isValid: true }
}

/**
 * Validate and get the correct chainId for the session
 */
export function validateChainId(
  signClient: SignClient,
  session: WalletConnectSession
): SessionValidationResult {
  const activeSessions = signClient.session.getAll()
  const actualSession = activeSessions.find((s) => s.topic === session.topic)

  if (!actualSession) {
    return { isValid: false, error: 'Session not found' }
  }

  const sessionChains = actualSession.namespaces?.chia?.chains || []
  let validChainId = session.chainId

  // Only validate if the session has chains defined
  if (sessionChains.length > 0) {
    // If the requested chainId is not in the session's chains, use the first available chainId
    if (!sessionChains.includes(session.chainId)) {
      validChainId = sessionChains[0]
      logger.warn(
        `⚠️ Requested chainId ${session.chainId} not in session chains [${sessionChains.join(', ')}]. Using ${validChainId} instead.`
      )
    }
  } else {
    // Session doesn't have chains in namespaces - use the provided chainId
    logger.debug(`ℹ️ Session ${session.topic} has no chains in namespaces, using provided chainId: ${session.chainId}`)
  }

  return { isValid: true, validChainId }
}
