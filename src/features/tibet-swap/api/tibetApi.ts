"use client";

import type {
  TibetApiPair,
  TibetCreateOfferBody,
  TibetOfferResponse,
  TibetQuote,
  TibetQuoteParams,
  TibetRouter,
  TibetToken,
} from "../lib/tibetTypes";
import { logger } from "@/shared/lib/logger";

export interface TibetApiClientOptions {
  baseUrl: string;
}

function buildQueryString(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function createTibetApiClient({ baseUrl }: TibetApiClientOptions) {
  const get = async <T>(path: string, query?: Record<string, string | number | boolean | undefined | null>): Promise<T> => {
    const url = `${baseUrl}${path}${query ? buildQueryString(query) : ""}`;
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      logger.error("Tibet API GET error", { path, status: res.status, text });
      throw new Error(`Tibet API error: ${res.status} ${text}`);
    }
    return res.json() as Promise<T>;
  };

  const post = async <T>(path: string, body: unknown): Promise<T> => {
    const url = `${baseUrl}${path}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      logger.error("Tibet API POST error", { path, status: res.status, text });
      throw new Error(`Tibet API error: ${res.status} ${text}`);
    }
    return res.json() as Promise<T>;
  };

  return {
    getTokens: () => get<TibetToken[]>("/tokens"),
    getPairs: (params?: { skip?: number; limit?: number }) =>
      get<TibetApiPair[]>("/pairs", params as Record<string, number | undefined>),
    getToken: (assetId: string) => get<TibetToken>(`/token/${encodeURIComponent(assetId)}`),
    getPair: (launcherId: string) =>
      get<TibetApiPair>(`/pair/${encodeURIComponent(launcherId)}`),
    getRouter: (params?: { rcat?: boolean }) =>
      get<TibetRouter>("/router", params as Record<string, boolean | undefined>),
    getQuote: (params: TibetQuoteParams) => {
      const { pair_id, amount_in, amount_out, xch_is_input, estimate_fee } = params;
      return get<TibetQuote>(`/quote/${encodeURIComponent(pair_id)}`, {
        amount_in: amount_in ?? undefined,
        amount_out: amount_out ?? undefined,
        xch_is_input: xch_is_input ?? true,
        estimate_fee: estimate_fee ?? false,
      });
    },
    createOffer: (pairId: string, body: TibetCreateOfferBody) =>
      post<TibetOfferResponse>(`/offer/${encodeURIComponent(pairId)}`, body),
  };
}

export type TibetApiClient = ReturnType<typeof createTibetApiClient>;
