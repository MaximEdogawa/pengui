'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNetwork } from '@/shared/hooks/useNetwork'
import type {
  AssetType,
  CoinSpend,
  CancelOfferRequest,
  OfferRequest,
  SignMessageRequest,
  TakeOfferRequest,
  TransactionRequest,
} from '@/shared/lib/walletConnect/types/command.types'
import {
  cancelOffer,
  createOffer,
  getAssetBalance,
  getWalletAddress,
  sendTransaction,
  signCoinSpends,
  signMessage,
  takeOffer,
} from '@/shared/lib/walletConnect/repositories/walletQueries.repository'
import { useSignClient } from './useSignClient'
import { useWalletSession } from './useWalletSession'

const WALLET_CONNECT_KEY = 'walletConnect'
const BALANCE_KEY = 'balance'
const ADDRESS_KEY = 'address'

/**
 * Hook to get wallet balance.
 * Query keys normalise undefined → null so every call-site shares one cache entry.
 */
export function useWalletBalance(type?: AssetType | null, assetId?: string | null) {
  const { signClient } = useSignClient()
  const session = useWalletSession()
  const { network } = useNetwork()

  const normalType = type ?? null
  const normalAssetId = assetId ?? null

  return useQuery({
    queryKey: [WALLET_CONNECT_KEY, BALANCE_KEY, normalType, normalAssetId, network],
    queryFn: async () => {
      const result = await getAssetBalance(signClient, session, normalType, normalAssetId)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    enabled: signClient != null && session.isConnected,
    staleTime: Infinity,
    retry: 1,
  })
}

/**
 * Hook to get wallet address
 */
export function useWalletAddress() {
  const { signClient } = useSignClient()
  const session = useWalletSession()
  const { network } = useNetwork()

  return useQuery({
    queryKey: [WALLET_CONNECT_KEY, ADDRESS_KEY, network],
    queryFn: async () => {
      const result = await getWalletAddress(signClient, session)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    enabled: signClient != null && session.isConnected,
    staleTime: Infinity,
    retry: 1,
  })
}

export function useSignCoinSpends() {
  const { signClient } = useSignClient()
  const session = useWalletSession()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { walletId: number; coinSpends: CoinSpend[] }) => {
      const result = await signCoinSpends(params, signClient, session)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WALLET_CONNECT_KEY, BALANCE_KEY] })
    },
  })
}

export function useSignMessage() {
  const { signClient } = useSignClient()
  const session = useWalletSession()

  return useMutation({
    mutationFn: async (data: SignMessageRequest) => {
      const result = await signMessage(data, signClient, session)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
  })
}

export function useSendTransaction() {
  const { signClient } = useSignClient()
  const session = useWalletSession()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: TransactionRequest) => {
      const result = await sendTransaction(data, signClient, session)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WALLET_CONNECT_KEY, BALANCE_KEY] })
    },
  })
}

export function useCreateOffer() {
  const { signClient } = useSignClient()
  const session = useWalletSession()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: OfferRequest) => {
      const result = await createOffer(data, signClient, session)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WALLET_CONNECT_KEY, BALANCE_KEY] })
    },
  })
}

export function useCancelOffer() {
  const { signClient } = useSignClient()
  const session = useWalletSession()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CancelOfferRequest) => {
      const result = await cancelOffer(data, signClient, session)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WALLET_CONNECT_KEY, BALANCE_KEY] })
    },
  })
}

export function useTakeOffer() {
  const { signClient } = useSignClient()
  const session = useWalletSession()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: TakeOfferRequest) => {
      const result = await takeOffer(data, signClient, session)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WALLET_CONNECT_KEY, BALANCE_KEY] })
    },
  })
}

/**
 * Refresh all wallet data: first re-fetch asset list from SpaceScan,
 * then reload all balances from WalletConnect.
 */
export function useRefreshBalance() {
  const queryClient = useQueryClient()

  return {
    refreshBalance: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['spacescan', 'token-balance'],
      })
      await queryClient.invalidateQueries({
        queryKey: [WALLET_CONNECT_KEY, BALANCE_KEY],
      })
    },
  }
}
