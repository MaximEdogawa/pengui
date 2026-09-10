"use client";

import { logger } from "@/shared/lib/logger";
import { getSignClientConfig } from "@/shared/lib/walletConnect/constants/wallet-connect";
import type { WalletConnectInstance } from "@/shared/lib/walletConnect/types/walletConnect.types";
import { useQuery } from "@tanstack/react-query";
import { useLayoutEffect } from "react";
import { SignClient } from "@walletconnect/sign-client";
import { registerWalletConnectListeners } from "./eventListeners";
import { useNetwork } from "@/shared/hooks/useNetwork";

/**
 * Hook to get the WalletConnect SignClient instance.
 * Implementation detail of the WalletConnect adapter — features talk to the
 * WalletProvider instead.
 * SignClient is initialized once and cached with TanStack Query.
 * Listeners are registered immediately on creation and again in useLayoutEffect when using cached data.
 */
export function useWalletConnectSignClient() {
  const { network } = useNetwork();
  const instanceQuery = useQuery<WalletConnectInstance | undefined>({
    queryKey: ["walletConnect", "instance", network],
    queryFn: async () => {
      try {
        const config = getSignClientConfig();
        const signClient = await SignClient.init(config);
        registerWalletConnectListeners(signClient);
        return { signClient };
      } catch (error) {
        logger.error("❌ WalletConnect SignClient initialization failed:", error);
        throw error;
      }
    },
    enabled: true,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useLayoutEffect(() => {
    if (instanceQuery.data?.signClient) {
      registerWalletConnectListeners(instanceQuery.data.signClient);
    }
  }, [instanceQuery.data?.signClient]);

  return {
    signClient: instanceQuery.data?.signClient,
    isInitializing: instanceQuery.isPending,
    isInitialized: instanceQuery.isSuccess,
    error: instanceQuery.error,
  };
}
