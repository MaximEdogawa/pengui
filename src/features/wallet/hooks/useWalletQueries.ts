"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNetwork } from "@/shared/hooks/useNetwork";
import { useWalletProvider, useWalletState } from "@/shared/providers/WalletRuntimeProvider";
import type {
  AssetType,
  CancelOfferRequest,
  OfferRequest,
  SignCoinSpendsRequest,
  SignMessageRequest,
  TakeOfferRequest,
  TransactionRequest,
} from "@/shared/lib/wallet";

const WALLET_CONNECT_KEY = "walletConnect";
const BALANCE_KEY = "balance";
const ADDRESS_KEY = "address";

/**
 * Hook to get wallet balance.
 * Query keys normalise undefined → null so every call-site shares one cache entry.
 */
export function useWalletBalance(type?: AssetType | null, assetId?: string | null) {
  const provider = useWalletProvider();
  const { isReady } = useWalletState();
  const { network } = useNetwork();

  const normalType = type ?? null;
  const normalAssetId = assetId ?? null;

  return useQuery({
    queryKey: [WALLET_CONNECT_KEY, BALANCE_KEY, normalType, normalAssetId, network],
    queryFn: async () => {
      const result = await provider.getAssetBalance(normalType, normalAssetId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: isReady,
    staleTime: Infinity,
    retry: 1,
  });
}

/**
 * Hook to get wallet address
 */
export function useWalletAddress() {
  const provider = useWalletProvider();
  const { isReady } = useWalletState();
  const { network } = useNetwork();

  return useQuery({
    queryKey: [WALLET_CONNECT_KEY, ADDRESS_KEY, network],
    queryFn: async () => {
      const result = await provider.getAddress();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: isReady,
    staleTime: Infinity,
    retry: 1,
  });
}

export function useSignCoinSpends() {
  const provider = useWalletProvider();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SignCoinSpendsRequest) => {
      const result = await provider.signCoinSpends(params);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WALLET_CONNECT_KEY, BALANCE_KEY] });
    },
  });
}

export function useSignMessage() {
  const provider = useWalletProvider();

  return useMutation({
    mutationFn: async (data: SignMessageRequest) => {
      const result = await provider.signMessage(data);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    retry: false,
  });
}

export function useSendTransaction() {
  const provider = useWalletProvider();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TransactionRequest) => {
      const result = await provider.sendXch(data);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WALLET_CONNECT_KEY, BALANCE_KEY] });
    },
  });
}

export function useCreateOffer() {
  const provider = useWalletProvider();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: OfferRequest) => {
      const result = await provider.createOffer(data);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WALLET_CONNECT_KEY, BALANCE_KEY] });
    },
  });
}

export function useCancelOffer() {
  const provider = useWalletProvider();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CancelOfferRequest) => {
      const result = await provider.cancelOffer(data);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WALLET_CONNECT_KEY, BALANCE_KEY] });
    },
  });
}

export function useTakeOffer() {
  const provider = useWalletProvider();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TakeOfferRequest) => {
      const result = await provider.takeOffer(data);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WALLET_CONNECT_KEY, BALANCE_KEY] });
    },
  });
}

/**
 * Refresh all wallet data: first re-fetch asset list from SpaceScan,
 * then reload all balances from the wallet provider.
 */
export function useRefreshBalance() {
  const queryClient = useQueryClient();

  return {
    refreshBalance: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["spacescan", "token-balance"],
      });
      await queryClient.invalidateQueries({
        queryKey: [WALLET_CONNECT_KEY, BALANCE_KEY],
      });
    },
  };
}
