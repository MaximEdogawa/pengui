// Command types for Sage Wallet Connect
import type { SageMethodName } from '../constants/sage-methods'

export type WalletConnectCommand = SageMethodName

// Command parameter types
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Chip0002ConnectParams {
  // No parameters for connect
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Chip0002ChainIdParams {
  // No parameters for chainId
}

export interface Chip0002GetPublicKeysParams {
  walletIds?: number[]
}

export interface Chip0002FilterUnlockedCoinsParams {
  walletId: number
  coinIds?: string[]
}

export interface Chip0002GetAssetCoinsParams {
  walletId: number
  assetId?: string
}

export type AssetType = 'cat' | 'nft' | 'did' | null

export interface Chip0002GetAssetBalanceParams {
  type: AssetType
  assetId: string
}

export interface Chip0002SignCoinSpendsParams {
  walletId: number
  coinSpends: Array<{
    coin: {
      parent_coin_info: string
      puzzle_hash: string
      amount: number
    }
    puzzle_reveal: string
    solution: string
  }>
}

export interface Chip0002SignMessageParams {
  message: string
  address?: string
  walletId?: number
}

export interface Chip0002SendTransactionParams {
  walletId: number
  amount: number
  fee: number
  address: string
  memos?: string[]
}

export interface ChiaCreateOfferParams {
  walletId: number
  offerAssets: Array<{
    assetId: string
    amount: number
  }>
  requestAssets: Array<{
    assetId: string
    amount: number
  }>
  fee?: number
}

export interface ChiaTakeOfferParams {
  offer: string
  fee?: number
}

export interface ChiaCancelOfferParams {
  tradeId: string
  fee?: number
}

export interface ChiaGetNftsParams {
  walletId: number
  startIndex?: number
  num?: number
}

export interface ChiaSendParams {
  walletId: number
  amount: number
  fee: number
  address: string
  memos?: string[]
}

export interface ChiaGetAddressParams {
  walletId: number
  newAddress?: boolean
}

export interface ChiaSignMessageByAddressParams {
  address: string
  message: string
}

export interface ChiaBulkMintNftsParams {
  walletId: number
  nftList: Array<{
    uris: string[]
    hash: string
    metaUris: string[]
    metaHash: string
    licenseUris: string[]
    licenseHash: string
    editionTotal: number
    editionNumber: number
    fee: number
    royaltyPercentage: number
    royaltyAddress: string
    targetAddress: string
  }>
  fee?: number
}

// Union type for all command parameters
export type CommandParams =
  | Chip0002ConnectParams
  | Chip0002ChainIdParams
  | Chip0002GetPublicKeysParams
  | Chip0002FilterUnlockedCoinsParams
  | Chip0002GetAssetCoinsParams
  | Chip0002GetAssetBalanceParams
  | Chip0002SignCoinSpendsParams
  | Chip0002SignMessageParams
  | Chip0002SendTransactionParams
  | ChiaCreateOfferParams
  | ChiaTakeOfferParams
  | ChiaCancelOfferParams
  | ChiaGetNftsParams
  | ChiaSendParams
  | ChiaGetAddressParams
  | ChiaSignMessageByAddressParams
  | ChiaBulkMintNftsParams

// Command response types
export interface Chip0002ConnectResponse {
  success: boolean
  fingerprint?: number
  address?: string
}

export interface Chip0002ChainIdResponse {
  chainId: string
}

export interface Chip0002GetPublicKeysResponse {
  publicKeys: Array<{
    walletId: number
    publicKey: string
  }>
}

export interface Chip0002FilterUnlockedCoinsResponse {
  coins: Array<{
    coinId: string
    parentCoinInfo: string
    puzzleHash: string
    amount: number
  }>
}

export interface Chip0002GetAssetCoinsResponse {
  coins: Array<{
    coinId: string
    parentCoinInfo: string
    puzzleHash: string
    amount: number
  }>
}

export interface Chip0002GetAssetBalanceResponse {
  balance: number
  assetId: string
}

export interface Chip0002SignCoinSpendsResponse {
  signedCoinSpends: Array<{
    coin: {
      parent_coin_info: string
      puzzle_hash: string
      amount: number
    }
    puzzle_reveal: string
    solution: string
  }>
}

export interface Chip0002SignMessageResponse {
  signature: string
  message: string
  address: string
}

export interface Chip0002SendTransactionResponse {
  transactionId: string
  transaction: Record<string, unknown>
}

export interface ChiaCreateOfferResponse {
  offer: string
  tradeId: string
  id: string
}

export interface ChiaTakeOfferResponse {
  tradeId: string
  success: boolean
}

export interface ChiaCancelOfferResponse {
  success: boolean
}

export interface ChiaGetNftsResponse {
  nfts: Array<{
    nftId: string
    launcherId: string
    nftCoinId: string
    ownerDid: string
    ownerPubkey: string
    minterDid: string
    minterPubkey: string
    royaltyPercentage: number
    royaltyPuzzleHash: string
    dataUris: string[]
    dataHash: string
    metaUris: string[]
    metaHash: string
    licenseUris: string[]
    licenseHash: string
    editionTotal: number
    editionNumber: number
    updaterPuzhash: string
    chainInfo: string
    mintHeight: number
    supportsDid: boolean
    p2Address: string
    pendingTransaction: boolean
    mintingCoinId: string
    launcherPuzhash: string
  }>
}

export interface ChiaSendResponse {
  transactionId: string
  transaction: Record<string, unknown>
}

export interface ChiaGetAddressResponse {
  address: string
  walletId: number
}

export interface ChiaSignMessageByAddressResponse {
  signature: string
  message: string
  address: string
}

export interface ChiaBulkMintNftsResponse {
  nftIds: string[]
  transactionId: string
}

// Union type for all command responses
export type CommandResponse =
  | Chip0002ConnectResponse
  | Chip0002ChainIdResponse
  | Chip0002GetPublicKeysResponse
  | Chip0002FilterUnlockedCoinsResponse
  | Chip0002GetAssetCoinsResponse
  | Chip0002GetAssetBalanceResponse
  | Chip0002SignCoinSpendsResponse
  | Chip0002SignMessageResponse
  | Chip0002SendTransactionResponse
  | ChiaCreateOfferResponse
  | ChiaTakeOfferResponse
  | ChiaCancelOfferResponse
  | ChiaGetNftsResponse
  | ChiaSendResponse
  | ChiaGetAddressResponse
  | ChiaSignMessageByAddressResponse
  | ChiaBulkMintNftsResponse

// Additional types for wallet queries
export interface CoinSpend {
  coin: {
    parent_coin_info: string
    puzzle_hash: string
    amount: number
  }
  puzzle_reveal: string
  solution: string
}

export interface TransactionRequest {
  walletId: number
  amount: number
  fee: number
  address: string
  memos?: string[]
  [key: string]: unknown
}

export interface TransactionResponse {
  transactionId: string
  transaction: Record<string, unknown>
}

export interface OfferRequest {
  walletId: number
  offerAssets: Array<{
    assetId: string
    amount: number
  }>
  requestAssets: Array<{
    assetId: string
    amount: number
  }>
  fee?: number
  [key: string]: unknown
}

export interface OfferResponse {
  offer: string
  tradeId: string
  id: string
}

export interface TakeOfferRequest {
  offer: string
  fee?: number
  [key: string]: unknown
}

export interface TakeOfferResponse {
  tradeId: string
  success: boolean
}

export interface CancelOfferRequest {
  id: string
  fee?: number
  [key: string]: unknown
}

export interface CancelOfferResponse {
  success: boolean
}

export interface SignMessageRequest {
  message: string
  address?: string
  walletId?: number
  [key: string]: unknown
}

export interface SignMessageResponse {
  signature: string
  message: string
  address: string
}
