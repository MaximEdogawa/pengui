import { logger } from '@/shared/lib/logger'
import { SageMethods } from '../constants/sage-methods'
import type {
  AssetType,
  CancelOfferRequest,
  CancelOfferResponse,
  CoinSpend,
  OfferRequest,
  OfferResponse,
  SignMessageRequest,
  SignMessageResponse,
  TakeOfferRequest,
  TakeOfferResponse,
  TransactionRequest,
  TransactionResponse,
} from '../types/command.types'
import type { AssetBalance, AssetCoins, WalletConnectSession } from '../types/walletConnect.types'
import type SignClient from '@walletconnect/sign-client'

const REQUEST_TIMEOUT = 30000

export async function makeWalletRequest<T>(
  method: string,
  data: Record<string, unknown>,
  signClient: SignClient | undefined,
  session: WalletConnectSession
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    if (!signClient) throw new Error('SignClient is not initialized')

    if (!session.isConnected || !session.session) {
      logger.warn('❌ Session is not connected')
      return { success: false, error: 'Session is not connected' }
    }

    const activeSessions = signClient.session.getAll()
    const sessionExists = activeSessions.some((s) => s.topic === session.topic)

    if (!sessionExists) {
      logger.warn(`❌ Session ${session.topic} no longer exists in SignClient`)
      return { success: false, error: 'Session no longer exists' }
    }

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Request timeout after 30 seconds'))
      }, REQUEST_TIMEOUT)
    })

    const walletRequestPromise = signClient.request({
      topic: session.topic,
      chainId: session.chainId,
      request: {
        method,
        params: { fingerprint: session.fingerprint, ...data },
      },
    })

    const result = (await Promise.race([walletRequestPromise, timeoutPromise])) as
      | T
      | { error: Record<string, unknown> }
      | { error: string }

    if (result && typeof result === 'object' && 'error' in result) {
      const errorObj = result.error
      const errorMessage =
        typeof errorObj === 'string'
          ? errorObj
          : typeof errorObj === 'object' && errorObj !== null && 'message' in errorObj
            ? String(errorObj.message)
            : 'Wallet returned an error'
      logger.warn(`Wallet returned an error for ${method}:`, errorMessage)
      return { success: false, error: errorMessage }
    }
    logger.info(`Wallet request for ${method}:`, result)
    return { success: true, data: result as T }
  } catch (error) {
    // Extract error message from various error formats
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

    // Handle specific error codes
    if (errorCode === 4001) {
      // Error code 4001 can mean user rejection OR request failure
      if (
        errorMessage.toLowerCase().includes('rejected') ||
        errorMessage.toLowerCase().includes('denied') ||
        errorMessage.toLowerCase().includes('cancelled')
      ) {
        logger.info('User rejected the wallet request (code 4001)')
        return { success: false, error: 'Request was cancelled in wallet' }
      } else {
        // Request failed for another reason (offer not found, already cancelled, etc.)
        logger.warn(`Wallet request failed (code 4001): ${errorMessage}`)
        return {
          success: false,
          error:
            errorMessage ||
            'The wallet could not process the cancel request. The offer may not exist or may already be cancelled.',
        }
      }
    }

    // Handle user rejection by message
    if (
      errorMessage.includes('User rejected') ||
      errorMessage.includes('User denied') ||
      errorMessage.includes('rejected') ||
      errorMessage.includes('denied')
    ) {
      logger.info('User rejected the wallet request')
      return { success: false, error: 'Request was cancelled in wallet' }
    }

    // Handle relay message errors (often non-critical)
    if (
      errorMessage.includes('onRelayMessage') ||
      errorMessage.includes('failed to process an inbound message') ||
      errorMessage.includes('relay')
    ) {
      logger.warn('⚠️ WalletConnect relay message error (non-critical):', errorMessage)
      // These are often transient relay errors, don't fail the request
      return { success: false, error: 'Relay communication error. Please try again.' }
    }

    // Handle session_ping errors (non-critical WalletConnect internal warnings)
    if (errorMessage.includes('session_ping') || errorMessage.includes('without any listeners')) {
      logger.warn('⚠️ WalletConnect session_ping warning (non-critical):', errorMessage)
      // This is an internal SDK warning, check if we got a response anyway
      // If the request actually failed, it will be caught by the timeout or other error handling
    }

    if (errorMessage.includes('Missing or invalid') || errorMessage.includes('recently deleted')) {
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
}

export async function getWalletAddress(
  signClient: SignClient | undefined,
  session: WalletConnectSession
): Promise<{
  success: boolean
  data?: { address: string }
  error?: string
}> {
  return await makeWalletRequest<{ address: string }>(
    SageMethods.CHIA_GET_ADDRESS,
    {},
    signClient,
    session
  )
}

export async function getAssetBalance(
  signClient: SignClient | undefined,
  session: WalletConnectSession,
  type: AssetType | null = null,
  assetId: string | null = null
): Promise<{ success: boolean; data?: AssetBalance | null; error?: string }> {
  return await makeWalletRequest<AssetBalance>(
    SageMethods.CHIP0002_GET_ASSET_BALANCE,
    { type, assetId },
    signClient,
    session
  )
}

export async function getAssetCoins(
  signClient: SignClient | undefined,
  session: WalletConnectSession,
  type: AssetType | null = null,
  assetId: string | null = null
): Promise<{ success: boolean; data?: AssetCoins | null; error?: string }> {
  return await makeWalletRequest<AssetCoins>(
    SageMethods.CHIP0002_GET_ASSET_COINS,
    {
      type,
      assetId,
    },
    signClient,
    session
  )
}

export async function testRpcConnection(
  signClient: SignClient | undefined,
  session: WalletConnectSession
): Promise<{
  success: boolean
  data?: boolean
  error?: string
}> {
  return await makeWalletRequest<boolean>(SageMethods.CHIP0002_CONNECT, {}, signClient, session)
}

export async function signCoinSpends(
  params: {
    walletId: number
    coinSpends: CoinSpend[]
  },
  signClient: SignClient | undefined,
  session: WalletConnectSession
): Promise<{
  success: boolean
  data?: CoinSpend[]
  error?: string
}> {
  return await makeWalletRequest<CoinSpend[]>(
    SageMethods.CHIP0002_SIGN_COIN_SPENDS,
    params,
    signClient,
    session
  )
}

export async function signMessage(
  params: SignMessageRequest,
  signClient: SignClient | undefined,
  session: WalletConnectSession
): Promise<{
  success: boolean
  data?: SignMessageResponse
  error?: string
}> {
  return await makeWalletRequest<SignMessageResponse>(
    SageMethods.CHIP0002_SIGN_MESSAGE,
    params,
    signClient,
    session
  )
}

export async function sendTransaction(
  params: TransactionRequest,
  signClient: SignClient | undefined,
  session: WalletConnectSession
): Promise<{
  success: boolean
  data?: TransactionResponse
  error?: string
}> {
  return await makeWalletRequest<TransactionResponse>(
    SageMethods.CHIA_SEND,
    params,
    signClient,
    session
  )
}

export async function createOffer(
  params: OfferRequest,
  signClient: SignClient | undefined,
  session: WalletConnectSession
): Promise<{
  success: boolean
  data?: OfferResponse
  error?: string
}> {
  return await makeWalletRequest<OfferResponse>(
    SageMethods.CHIA_CREATE_OFFER,
    params,
    signClient,
    session
  )
}

export async function takeOffer(
  params: TakeOfferRequest,
  signClient: SignClient | undefined,
  session: WalletConnectSession
): Promise<{
  success: boolean
  data?: TakeOfferResponse
  error?: string
}> {
  return await makeWalletRequest<TakeOfferResponse>(
    SageMethods.CHIA_TAKE_OFFER,
    params,
    signClient,
    session
  )
}

export async function cancelOffer(
  params: CancelOfferRequest,
  signClient: SignClient | undefined,
  session: WalletConnectSession
): Promise<{
  success: boolean
  data?: CancelOfferResponse
  error?: string
}> {
  return await makeWalletRequest<CancelOfferResponse>(
    SageMethods.CHIA_CANCEL_OFFER,
    params,
    signClient,
    session
  )
}
