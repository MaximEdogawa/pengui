"use client";

import { useQuery } from "@tanstack/react-query";
import { useTibetApi, TIBET_KEY } from "./useTibetApi";
import type { TibetQuoteParams } from "../lib/tibetTypes";

export function useTibetQuote(params: TibetQuoteParams | null) {
  const api = useTibetApi();
  const enabled =
    !!params?.pair_id &&
    (params.amount_in != null || params.amount_out != null);
  return useQuery({
    queryKey: [TIBET_KEY, "quote", params],
    queryFn: () =>
      api.getQuote({
        pair_id: params!.pair_id,
        amount_in: params!.amount_in,
        amount_out: params!.amount_out,
        xch_is_input: params!.xch_is_input,
        estimate_fee: params!.estimate_fee,
      }),
    enabled: !!enabled,
    staleTime: 30 * 1000,
  });
}
