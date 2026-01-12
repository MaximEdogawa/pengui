import type SignClient from '@walletconnect/sign-client'
import type { SessionTypes } from '@walletconnect/types'

export interface WalletConnectInstance {
  signClient: SignClient
}

export interface AssetBalance {
  confirmed: string
  spendable: string
  spendableCoinCount: number
}

export interface LegacyAssetBalance {
  balance: number
  assetId: string
}

export interface CoinInfo {
  parent_coin_info: string
  puzzle_hash: string
  amount: number
}

export interface LineageProof {
  parentName: string
  innerPuzzleHash: string
  amount: number
}

export interface AssetCoin {
  coin: CoinInfo
  coinName: string
  confirmedBlockIndex: number
  lineageProof: LineageProof
  locked: boolean
  puzzle: string
}

export type AssetCoins = AssetCoin[]

export interface WalletConnectSession {
  session: SessionTypes.Struct | null
  chainId: string
  fingerprint: number
  topic: string
  isConnected: boolean
}
