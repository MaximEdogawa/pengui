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

function buildQueryString(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });

  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

async function tibetFetch<T>(
  baseUrl: string,
  path: string,
  options?: {
    method?: string;
    body?: unknown;
    query?: Record<string, string | number | boolean | undefined | null>;
  },
): Promise<T> {
  const url = `${baseUrl}${path}${options?.query ? buildQueryString(options.query) : ""}`;
  const res = await fetch(url, {
    method: options?.method || "GET",
    headers: options?.body ? { "Content-Type": "application/json" } : undefined,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    logger.error("Tibet API error", { path, status: res.status, text });
    throw new Error(`Tibet API error: ${res.status} ${text}`);
  }

  return res.json() as Promise<T>;
}

export interface TibetApiClient {
  getTokens: () => Promise<TibetToken[]>;
  getPairs: (params?: {
    skip?: number;
    limit?: number;
  }) => Promise<TibetApiPair[]>;
  getToken: (assetId: string) => Promise<TibetToken>;
  getPair: (launcherId: string) => Promise<TibetApiPair>;
  getRouter: (params?: { rcat?: boolean }) => Promise<TibetRouter>;
  getQuote: (params: TibetQuoteParams) => Promise<TibetQuote>;
  createOffer: (
    pairId: string,
    body: TibetCreateOfferBody,
  ) => Promise<TibetOfferResponse>;
}

export function createTibetApiClient({
  baseUrl,
}: TibetApiClientOptions): TibetApiClient {
  const getTokens = () => tibetFetch<TibetToken[]>(baseUrl, "/tokens");

  const getPairs = (params?: { skip?: number; limit?: number }) =>
    tibetFetch<TibetApiPair[]>(baseUrl, "/pairs", {
      query: params as Record<string, number | undefined>,
    });

  const getToken = (assetId: string) =>
    tibetFetch<TibetToken>(baseUrl, `/token/${encodeURIComponent(assetId)}`);

  const getPair = (launcherId: string) =>
    tibetFetch<TibetApiPair>(
      baseUrl,
      `/pair/${encodeURIComponent(launcherId)}`,
    );

  const getRouter = (params?: { rcat?: boolean }) =>
    tibetFetch<TibetRouter>(baseUrl, "/router", {
      query: params as Record<string, boolean | undefined>,
    });

  const getQuote = (params: TibetQuoteParams) => {
    const { pair_id, amount_in, amount_out, xch_is_input, estimate_fee } =
      params;
    return tibetFetch<TibetQuote>(
      baseUrl,
      `/quote/${encodeURIComponent(pair_id)}`,
      {
        query: {
          amount_in: amount_in ?? undefined,
          amount_out: amount_out ?? undefined,
          xch_is_input: xch_is_input ?? true,
          estimate_fee: estimate_fee ?? false,
        },
      },
    );
  };

  const createOffer = (pairId: string, body: TibetCreateOfferBody) =>
    tibetFetch<TibetOfferResponse>(
      baseUrl,
      `/offer/${encodeURIComponent(pairId)}`,
      {
        method: "POST",
        body,
      },
    );

  return {
    getTokens,
    getPairs,
    getToken,
    getPair,
    getRouter,
    getQuote,
    createOffer,
  };
}
