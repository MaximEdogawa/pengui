"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTibetApi, TIBET_KEY } from "./useTibetApi";
import type { TibetCreateOfferBody, TibetActionType } from "../lib/tibetTypes";
import { TIBET_SUBMIT_USER_MESSAGE } from "../lib/tibetSubmitUserMessage";
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
      try {
        const data = await api.createOffer(variables.pair_id, body);
        if (!data.success) {
          logger.error("Tibet create offer rejected", { message: data.message });
          throw new Error(TIBET_SUBMIT_USER_MESSAGE);
        }
        return data;
      } catch (e) {
        if (e instanceof Error && e.message === TIBET_SUBMIT_USER_MESSAGE) {
          throw e;
        }
        logger.error("Tibet create offer failed", e);
        throw new Error(TIBET_SUBMIT_USER_MESSAGE);
      }
    },
    onSuccess: (data) => {
      logger.info("Tibet create offer success", data);
      queryClient.invalidateQueries({ queryKey: [TIBET_KEY] });
    },
  });

  return {
    createOffer: mutation.mutateAsync,
    createOfferMutation: mutation,
    isCreating: mutation.isPending,
  };
}
