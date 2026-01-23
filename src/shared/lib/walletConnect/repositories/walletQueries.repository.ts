import { logger } from '@/shared/lib/logger'
import { SageMethods } from '../constants/sage-methods'
import { handleWalletRequestError } from './walletErrorHandler'
import { validateSessionConnection, validateChainId } from './walletSessionValidator'
import { xchToMojos } from '@/shared/lib/utils/chia-units'
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

/**
 * Create a timeout promise for wallet requests
 */
function createTimeoutPromise(): Promise<never> {
  return new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error('Request timeout after 30 seconds'))
    }, REQUEST_TIMEOUT)
  })
}

/**
 * Execute the wallet request with timeout
 */
interface ExecuteWalletRequestOptions {
  signClient: SignClient
  session: WalletConnectSession
  method: string
  data: Record<string, unknown>
  validChainId: string
}

async function executeWalletRequest<T>({
  signClient,
  session,
  method,
  data,
  validChainId,
}: ExecuteWalletRequestOptions): Promise<T | { error: Record<string, unknown> } | { error: string }> {
  const requestParams = { fingerprint: session.fingerprint, ...data }

  // Verify session is still active before making request
  const activeSessions = signClient.session.getAll()
  const activeSession = activeSessions.find(s => s.topic === session.topic)
  if (!activeSession) {
    return { error: `Session ${session.topic} is not active` }
  }

  // Verify the chainId is in the session's supported chains
  const sessionChains = activeSession.namespaces?.chia?.chains || []
  if (sessionChains.length > 0 && !sessionChains.includes(validChainId)) {
    return { error: `ChainId ${validChainId} not in session chains [${sessionChains.join(', ')}]` }
  }

  const timeoutPromise = createTimeoutPromise()
  
  try {
    const walletRequestPromise = signClient.request({
      topic: session.topic,
      chainId: validChainId,
      request: {
        method,
        params: requestParams,
      },
    })

    const result = await Promise.race([walletRequestPromise, timeoutPromise])
    return result as T | { error: Record<string, unknown> } | { error: string }
  } catch (error) {
    // Only log errors in development
    if (process.env.NODE_ENV === 'development') {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(`Wallet request failed for ${method}:`, errorMessage)
    }
    throw error
  }
}

/**
 * Process wallet request result
 * Handles various response formats from the wallet
 * 
 * Some wallets may return error structures even when operations succeed,
 * so we need to be careful about how we interpret the response.
 */
function processWalletRequestResult<T>(
  result: T | { error: Record<string, unknown> } | { error: string } | { success?: boolean; error?: unknown },
  method: string
): { success: boolean; data?: T; error?: string } {

  // Handle null/undefined result
  if (!result) {
    return { success: false, error: 'Wallet returned an empty response' }
  }

  // Check if result has a success property first (most reliable indicator)
  if (typeof result === 'object' && 'success' in result) {
    const successValue = (result as { success?: boolean }).success
    if (successValue === true) {
      return { success: true, data: result as T }
    }
    if (successValue === false) {
      const errorMessage = 
        'error' in result && result.error
          ? (typeof result.error === 'string' ? result.error : String(result.error))
          : 'Wallet request failed'
      return { success: false, error: errorMessage }
    }
  }

  // Check if result has an error property (but only treat as error if it's truthy)
  if (typeof result === 'object' && 'error' in result) {
    const errorObj = result.error
    
    // If error is null, undefined, empty string, or false, treat as success
    if (errorObj === null || errorObj === undefined || errorObj === '' || errorObj === false) {
      return { success: true, data: result as T }
    }

    // If error is a truthy value, extract the error message
    const errorMessage =
      typeof errorObj === 'string'
        ? errorObj
        : typeof errorObj === 'object' && errorObj !== null && 'message' in errorObj
          ? String(errorObj.message)
          : String(errorObj)
    
    // Special case: Some wallets return error messages that are actually warnings
    // Check if the result also has success indicators (like tradeId for takeOffer)
    if (method.includes('takeOffer') || method.includes('TakeOffer')) {
      const hasTradeId = result && typeof result === 'object' && ('tradeId' in result || 'data' in result)
      if (hasTradeId) {
        return { success: true, data: result as T }
      }
    }
    
    return { success: false, error: errorMessage }
  }

  // Default: treat as success if no error indicators found
  return { success: true, data: result as T }
}

export async function makeWalletRequest<T>(
  method: string,
  data: Record<string, unknown>,
  signClient: SignClient | undefined,
  session: WalletConnectSession
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    // Validate session connection
    const connectionValidation = validateSessionConnection(signClient, session)
    if (!connectionValidation.isValid) {
      return { success: false, error: connectionValidation.error }
    }

    // Ensure SignClient is ready - check if it has active sessions
    if (signClient) {
      const activeSessions = signClient.session.getAll()
      const hasActiveSession = activeSessions.some(s => s.topic === session.topic)
      if (!hasActiveSession) {
        return { success: false, error: 'Session not found in active WalletConnect sessions' }
      }
    }

    // Validate and get chainId
    const chainIdValidation = validateChainId(signClient!, session)
    if (!chainIdValidation.isValid) {
      return { success: false, error: chainIdValidation.error }
    }

    const validChainId = chainIdValidation.validChainId || session.chainId

    // Execute request with timeout
    const result = await executeWalletRequest<T>({
      signClient: signClient!,
      session,
      method,
      data,
      validChainId,
    })

    // Process and return result
    return processWalletRequestResult(result, method)
  } catch (error) {
    return handleWalletRequestError(error, method)
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

/**
 * Convert fee to mojos based on explicit unit
 * The wallet expects fee in mojos (smallest unit)
 */
function convertFeeToMojos(feeInXch?: number, feeInMojos?: number): number | undefined {
  if (feeInMojos !== undefined && feeInMojos !== null) {
    return feeInMojos
  }
  if (feeInXch !== undefined && feeInXch !== null && feeInXch > 0) {
    return xchToMojos(feeInXch)
  }
  return undefined
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
  // Validate offer parameter - reject if not a string or if whitespace-only
  const trimmedOffer = typeof params.offer === 'string' ? params.offer.trim() : ''
  if (!trimmedOffer) {
    return { success: false, error: 'Invalid offer parameter: offer must be a non-empty string' }
  }

  const feeInMojos = convertFeeToMojos(params.feeInXch, params.feeInMojos)
  const walletParams = {
    offer: trimmedOffer,
    ...(feeInMojos !== undefined && { fee: feeInMojos }),
  }
  
  return await makeWalletRequest<TakeOfferResponse>(
    SageMethods.CHIA_TAKE_OFFER,
    walletParams,
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
  if (!params.id || typeof params.id !== 'string') {
    return { success: false, error: 'Invalid id parameter: id must be a non-empty string' }
  }

  const feeInMojos = convertFeeToMojos(params.feeInXch, params.feeInMojos)
  const walletParams = {
    tradeId: params.id, // Map id to tradeId for wallet compatibility
    ...(feeInMojos !== undefined && { fee: feeInMojos }),
  }
  
  return await makeWalletRequest<CancelOfferResponse>(
    SageMethods.CHIA_CANCEL_OFFER,
    walletParams,
    signClient,
    session
  )
}
