"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTibetApi, TIBET_KEY } from "./useTibetApi";
import type { TibetCreateOfferBody, TibetActionType } from "../lib/tibetTypes";
import { logger } from "@/shared/lib/logger";

export interface TibetCreateOfferVariables {
  pair_id: string;
  offer: string;
  action: TibetActionType;
  total_donation_amount?: number;
  donation_addresses?: string[];
  donation_weights?: number[];
}

export function useTibetCreateOffer() {
  const queryClient = useQueryClient();
  const api = useTibetApi();

  const mutation = useMutation({
    mutationFn: async (variables: TibetCreateOfferVariables) => {
      const body: TibetCreateOfferBody = {
        offer: variables.offer,
        action: variables.action,
        ...(variables.total_donation_amount != null && {
          total_donation_amount: variables.total_donation_amount,
        }),
        ...(variables.donation_addresses?.length && {
          donation_addresses: variables.donation_addresses,
        }),
        ...(variables.donation_weights?.length && {
          donation_weights: variables.donation_weights,
        }),
      };
      return api.createOffer(variables.pair_id, body);
    },
    onSuccess: (data) => {
      logger.info("Tibet create offer success", data);
      queryClient.invalidateQueries({ queryKey: [TIBET_KEY] });
    },
    onError: (error) => {
      logger.error("Tibet create offer failed", error);
    },
  });

  return {
    createOffer: mutation.mutateAsync,
    createOfferMutation: mutation,
    isCreating: mutation.isPending,
  };
}
