import { logger } from '@/shared/lib/logger'
import { SageMethods } from '../constants/sage-methods'
import { handleWalletRequestError } from './walletErrorHandler'
import { validateSessionConnection, validateChainId } from './walletSessionValidator'
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
async function executeWalletRequest<T>(
  signClient: SignClient,
  session: WalletConnectSession,
  method: string,
  data: Record<string, unknown>,
  validChainId: string
): Promise<T | { error: Record<string, unknown> } | { error: string }> {
  const timeoutPromise = createTimeoutPromise()
  const walletRequestPromise = signClient.request({
    topic: session.topic,
    chainId: validChainId,
    request: {
      method,
      params: { fingerprint: session.fingerprint, ...data },
    },
  })

  return (await Promise.race([walletRequestPromise, timeoutPromise])) as
    | T
    | { error: Record<string, unknown> }
    | { error: string }
}

/**
 * Process wallet request result
 */
function processWalletRequestResult<T>(
  result: T | { error: Record<string, unknown> } | { error: string },
  method: string
): { success: boolean; data?: T; error?: string } {
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

    // Validate and get chainId
    const chainIdValidation = validateChainId(signClient!, session)
    if (!chainIdValidation.isValid) {
      return { success: false, error: chainIdValidation.error }
    }

    const validChainId = chainIdValidation.validChainId || session.chainId

    // Execute request with timeout
    const result = await executeWalletRequest<T>(signClient!, session, method, data, validChainId)

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
