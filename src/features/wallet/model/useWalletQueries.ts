'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AssetType, CoinSpend } from '@/shared/lib/walletConnect/types/command.types'
import type {
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
  getAssetCoins,
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
const ASSET_COINS_KEY = 'assetCoins'

/**
 * Hook to get wallet balance
 */
export function useWalletBalance(type?: AssetType | null, assetId?: string | null) {
  const { signClient } = useSignClient()
  const session = useWalletSession()

  return useQuery({
    queryKey: [WALLET_CONNECT_KEY, BALANCE_KEY, type, assetId],
    queryFn: async () => {
      const result = await getAssetBalance(signClient, session, type ?? null, assetId ?? null)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    enabled: signClient != null && session.isConnected,
    retry: 3,
    staleTime: Infinity,
  })
}

/**
 * Hook to get wallet address
 */
export function useWalletAddress() {
  const { signClient } = useSignClient()
  const session = useWalletSession()

  return useQuery({
    queryKey: [WALLET_CONNECT_KEY, ADDRESS_KEY],
    queryFn: async () => {
      const result = await getWalletAddress(signClient, session)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    enabled: signClient != null && session.isConnected,
    retry: 3,
    staleTime: Infinity,
  })
}

/**
 * Hook to get asset coins
 */
export function useAssetCoins(type?: AssetType | null, assetId?: string | null) {
  const { signClient } = useSignClient()
  const session = useWalletSession()

  return useQuery({
    queryKey: [WALLET_CONNECT_KEY, ASSET_COINS_KEY, type, assetId],
    queryFn: async () => {
      const result = await getAssetCoins(signClient, session, type ?? null, assetId ?? null)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    enabled: signClient != null && session.isConnected,
    retry: 3,
    staleTime: Infinity,
  })
}

/**
 * Hook to sign coin spends
 */
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
      // Invalidate related queries if needed
      queryClient.invalidateQueries({ queryKey: [WALLET_CONNECT_KEY] })
    },
  })
}

/**
 * Hook to sign a message
 */
export function useSignMessage() {
  const { signClient } = useSignClient()
  const session = useWalletSession()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: SignMessageRequest) => {
      const result = await signMessage(data, signClient, session)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      // Invalidate related queries if needed
      queryClient.invalidateQueries({ queryKey: [WALLET_CONNECT_KEY] })
    },
  })
}

/**
 * Hook to send a transaction
 */
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
      // Invalidate balance and coins queries after transaction
      queryClient.invalidateQueries({ queryKey: [WALLET_CONNECT_KEY, BALANCE_KEY] })
      queryClient.invalidateQueries({ queryKey: [WALLET_CONNECT_KEY, ASSET_COINS_KEY] })
    },
  })
}

/**
 * Hook to get balance with mutation (for manual refresh)
 */
export function useGetBalance() {
  const { signClient } = useSignClient()
  const session = useWalletSession()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data?: { type?: AssetType | null; assetId?: string | null }) => {
      const type = data?.type ?? null
      const assetId = data?.assetId ?? null
      const result = await getAssetBalance(signClient, session, type, assetId)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: (_, variables) => {
      // Invalidate the balance query
      queryClient.invalidateQueries({
        queryKey: [WALLET_CONNECT_KEY, BALANCE_KEY, variables?.type, variables?.assetId],
      })
    },
  })
}

/**
 * Hook to create an offer
 */
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
      // Invalidate balance and coins queries after creating offer
      queryClient.invalidateQueries({ queryKey: [WALLET_CONNECT_KEY, BALANCE_KEY] })
      queryClient.invalidateQueries({ queryKey: [WALLET_CONNECT_KEY, ASSET_COINS_KEY] })
    },
  })
}

/**
 * Hook to cancel an offer
 */
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
      // Invalidate balance and coins queries after canceling offer
      queryClient.invalidateQueries({ queryKey: [WALLET_CONNECT_KEY, BALANCE_KEY] })
      queryClient.invalidateQueries({ queryKey: [WALLET_CONNECT_KEY, ASSET_COINS_KEY] })
    },
  })
}

/**
 * Hook to take an offer
 */
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
      // Invalidate balance and coins queries after taking offer
      queryClient.invalidateQueries({ queryKey: [WALLET_CONNECT_KEY, BALANCE_KEY] })
      queryClient.invalidateQueries({ queryKey: [WALLET_CONNECT_KEY, ASSET_COINS_KEY] })
    },
  })
}

/**
 * Helper hook to refresh wallet balance
 */
export function useRefreshBalance() {
  const queryClient = useQueryClient()

  return {
    refreshBalance: async () => {
      await queryClient.invalidateQueries({ queryKey: [WALLET_CONNECT_KEY, BALANCE_KEY] })
    },
  }
}
