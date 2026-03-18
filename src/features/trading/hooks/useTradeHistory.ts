"use client";

import { useCallback, useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMyTrades } from "./useMyTrades";
import {
  useTradeHistoryFilters,
  type TradeHistoryFilters,
} from "./useTradeHistoryFilters";
import { useOrderBook } from "./useOrderBook";
import { normalizeTickerForApi } from "../lib/orderBookParams";
import { useNetwork } from "@/shared/hooks/useNetwork";
import { getDexieApiUrl } from "@/shared/lib/utils/networkUtils";
import { offerStorageService } from "@/shared/lib/services/offerStorageService";
import type { DexieOffer, OfferState } from "@/entities/offer";
import type { OrderBookFilters } from "../lib/orderBookTypes";
import { useWalletAddress } from "@/features/wallet/hooks/useWalletQueries";

/** Fetch one page of offers for a given Dexie status (2=Pending, 3=Cancelled, 4=Completed). */
async function fetchOffersForStatus(
  dexieBaseUrl: string,
  opts: {
    targetRequested?: string;
    targetOffered?: string;
    myTradesOnly: boolean;
    walletAddress: string | undefined;
    status: number;
    sort: string;
    pageParam: number;
  },
): Promise<{ items: DexieOffer[]; rawCount: number }> {
  const { targetRequested, targetOffered, status, sort, pageParam } = opts;
  if (!targetRequested && !targetOffered) return { items: [], rawCount: 0 };

  const q = new URLSearchParams();
  if (targetRequested) q.append("requested", targetRequested);
  if (targetOffered) q.append("offered", targetOffered);
  q.append("sort", sort);
  q.append("page_size", String(PAGE_SIZE));
  q.append("page", String(pageParam));
  q.append("status", String(status));

  const res = await fetch(`${dexieBaseUrl}/v1/offers?${q.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch offers: ${res.status}`);

  const data = await res.json();
  let list: DexieOffer[] = [];
  if (Array.isArray(data)) list = data as DexieOffer[];
  else if (data && typeof data === "object") {
    if (Array.isArray((data as { data?: unknown[] }).data))
      list = (data as { data: DexieOffer[] }).data;
    else if (Array.isArray((data as { offers?: unknown[] }).offers))
      list = (data as { offers: DexieOffer[] }).offers;
  }

  const rawCount = list.length;

  const match = (a: { code?: string; id?: string } | undefined, t: string) =>
    !!a &&
    [a.code, a.id].some(
      (v) => v && String(v).toLowerCase() === t.toLowerCase(),
    );
  const items = list.filter((o) => {
    if (
      !o?.id ||
      (o.offered?.length ?? 0) === 0 ||
      (o.requested?.length ?? 0) === 0
    )
      return false;
    if (targetRequested && !o.requested?.some((a) => match(a, targetRequested)))
      return false;
    if (targetOffered && !o.offered?.some((a) => match(a, targetOffered)))
      return false;
    return true;
  });

  return { items, rawCount };
}

function mergeStatusOffers(
  sources: {
    show: boolean;
    pages: Array<{ items: DexieOffer[]; rawCount: number }> | undefined;
    offerState: OfferState;
  }[],
  getIsMyOffer: (o: DexieOffer) => boolean,
): TradeHistoryOfferItem[] {
  const out: TradeHistoryOfferItem[] = [];
  for (const { show, pages, offerState } of sources) {
    if (!show || !pages) continue;
    const raw = pages.flatMap((p) => p.items);
    out.push(
      ...raw.map((o) => ({ offer: o, offerState, isMyOffer: getIsMyOffer(o) })),
    );
  }
  return out;
}

function buildNextPageState(
  filters: TradeHistoryFilters,
  completedHasNext: boolean,
  cancelledHasNext: boolean,
  pendingHasNext: boolean,
) {
  return (
    (filters.showCompleted && completedHasNext) ||
    (filters.showCancelled && cancelledHasNext) ||
    (filters.showPending && pendingHasNext)
  );
}

function buildIsFetching(
  completedFetching: boolean,
  cancelledFetching: boolean,
  pendingFetching: boolean,
) {
  return completedFetching || cancelledFetching || pendingFetching;
}

function buildLoadingState(
  filters: TradeHistoryFilters,
  completedLoading: boolean,
  cancelledLoading: boolean,
  pendingLoading: boolean,
  orderBookLoading: boolean,
) {
  return (
    (filters.showOpen && orderBookLoading) ||
    (filters.showCompleted && completedLoading) ||
    (filters.showCancelled && cancelledLoading) ||
    (filters.showPending && pendingLoading)
  );
}

export interface TradeHistoryOfferItem {
  offer: DexieOffer;
  offerState: OfferState;
  isMyOffer: boolean;
}

export interface TradeHistoryOptions {
  orderBookFilters?: OrderBookFilters;
  tradeHistoryFilters?: TradeHistoryFilters;
  enabled?: boolean;
}

const PAGE_SIZE = 50;

export function useTradeHistory(options: TradeHistoryOptions = {}) {
  const {
    orderBookFilters: passedOrderBookFilters,
    tradeHistoryFilters: passedThFilters,
    enabled = true,
  } = options;
  const { filters: internalThFilters } = useTradeHistoryFilters();
  const { network } = useNetwork();
  const { data: walletData } = useWalletAddress();
  const walletAddress = walletData?.address;
  const { myTrades } = useMyTrades({});

  const orderBookFilters = passedOrderBookFilters;
  const thFilters = passedThFilters ?? internalThFilters;

  const { targetRequested, targetOffered, hasPairFilter } = useMemo(() => {
    const buy = orderBookFilters?.buyAsset?.[0];
    const sell = orderBookFilters?.sellAsset?.[0];
    const req = buy ? normalizeTickerForApi(buy, network) : undefined;
    const off = sell ? normalizeTickerForApi(sell, network) : undefined;
    return {
      targetRequested: req,
      targetOffered: off,
      hasPairFilter: !!(req || off),
    };
  }, [orderBookFilters?.buyAsset, orderBookFilters?.sellAsset, network]);

  const ourIdsQuery = useQuery({
    queryKey: ["our-dexie-offer-ids", walletAddress ?? "", network],
    queryFn: () =>
      offerStorageService.getOurDexieOfferIds(walletAddress!, network),
    enabled: enabled && !!walletAddress,
    staleTime: 60 * 1000,
  });

  const myOfferIdsQuery = useQuery({
    queryKey: ["my-offer-ids", walletAddress ?? "", network],
    queryFn: () => offerStorageService.getMyOfferIds(walletAddress!, network),
    enabled: enabled && !!walletAddress,
    staleTime: 60 * 1000,
  });

  const ourOfferIds = useMemo(() => {
    const fromDexieOurIds = ourIdsQuery.data ?? new Set<string>();
    const fromMyOfferIds = myOfferIdsQuery.data ?? new Set<string>();
    const fromMy = myTrades.map((t) => t.trade_id).filter(Boolean);
    return new Set([...fromDexieOurIds, ...fromMyOfferIds, ...fromMy]);
  }, [ourIdsQuery.data, myOfferIdsQuery.data, myTrades]);

  const baseEnabled =
    enabled && hasPairFilter && (!thFilters.myTradesOnly || !!walletAddress);
  const dexieUrl = getDexieApiUrl(network);
  const fetchOpts = {
    targetRequested,
    targetOffered,
    myTradesOnly: thFilters.myTradesOnly,
    walletAddress,
  };

  const completedQuery = useInfiniteQuery({
    queryKey: [
      "trade-history",
      "completed",
      network,
      targetRequested ?? "",
      targetOffered ?? "",
      thFilters.myTradesOnly,
      walletAddress ?? "",
    ],
    queryFn: ({ pageParam }) =>
      fetchOffersForStatus(dexieUrl, {
        ...fetchOpts,
        status: 4,
        sort: "date_completed",
        pageParam: pageParam as number,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _all, lastParam) =>
      lastPage.rawCount >= PAGE_SIZE ? (lastParam as number) + 1 : undefined,
    enabled: baseEnabled && thFilters.showCompleted,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    // Trade history is relatively stable; avoid aggressive background refetching
    // to reduce Dexie traffic. Data is refreshed when filters or pair change,
    // or when the user scrolls for more pages.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  });

  const cancelledQuery = useInfiniteQuery({
    queryKey: [
      "trade-history",
      "cancelled",
      network,
      targetRequested ?? "",
      targetOffered ?? "",
      thFilters.myTradesOnly,
      walletAddress ?? "",
    ],
    queryFn: ({ pageParam }) =>
      fetchOffersForStatus(dexieUrl, {
        ...fetchOpts,
        status: 3,
        sort: "date_found",
        pageParam: pageParam as number,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _all, lastParam) =>
      lastPage.rawCount >= PAGE_SIZE ? (lastParam as number) + 1 : undefined,
    enabled: baseEnabled && thFilters.showCancelled,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  });

  const pendingQuery = useInfiniteQuery({
    queryKey: [
      "trade-history",
      "pending",
      network,
      targetRequested ?? "",
      targetOffered ?? "",
      thFilters.myTradesOnly,
      walletAddress ?? "",
    ],
    queryFn: ({ pageParam }) =>
      fetchOffersForStatus(dexieUrl, {
        ...fetchOpts,
        status: 2,
        sort: "date_found",
        pageParam: pageParam as number,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _all, lastParam) =>
      lastPage.rawCount >= PAGE_SIZE ? (lastParam as number) + 1 : undefined,
    enabled: baseEnabled && thFilters.showPending,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  });

  const { orderBookData, orderBookLoading, orderBookError } = useOrderBook(
    enabled && thFilters.showOpen && hasPairFilter
      ? orderBookFilters
      : undefined,
  );

  const openOffers = useMemo(() => {
    if (!orderBookData?.length) return [];
    return orderBookData.map(
      (order): DexieOffer => ({
        id: order.id,
        requested: order.requesting,
        offered: order.offering,
        maker: order.maker,
        date_found: order.date_found,
        status: order.status,
        price: order.pricePerUnit ?? 0,
        fees: 0,
        known_taker: null,
      }),
    );
  }, [orderBookData]);

  const isOfferMine = useCallback(
    (offer: DexieOffer) => {
      return (
        ourOfferIds.has(offer.id) ||
        !!(
          offer.maker &&
          walletAddress &&
          offer.maker.toLowerCase() === walletAddress.toLowerCase()
        )
      );
    },
    [ourOfferIds, walletAddress],
  );

  const historyOffers = useMemo(
    () =>
      mergeStatusOffers(
        [
          {
            show: thFilters.showCompleted,
            pages: completedQuery.data?.pages,
            offerState: "Completed",
          },
          {
            show: thFilters.showCancelled,
            pages: cancelledQuery.data?.pages,
            offerState: "Cancelled",
          },
          {
            show: thFilters.showPending,
            pages: pendingQuery.data?.pages,
            offerState: "Pending",
          },
        ],
        isOfferMine,
      ),
    [
      thFilters.showCompleted,
      thFilters.showCancelled,
      thFilters.showPending,
      completedQuery.data?.pages,
      cancelledQuery.data?.pages,
      pendingQuery.data?.pages,
      isOfferMine,
    ],
  );

  const openItems = useMemo(() => {
    return thFilters.showOpen
      ? openOffers.map((o) => ({
          offer: o,
          offerState: "Open" as OfferState,
          isMyOffer: isOfferMine(o),
        }))
      : [];
  }, [thFilters.showOpen, openOffers, isOfferMine]);

  const offers = useMemo(() => {
    const allOffers = [...openItems, ...historyOffers];
    return thFilters.myTradesOnly
      ? allOffers.filter((item) => item.isMyOffer)
      : allOffers;
  }, [openItems, historyOffers, thFilters.myTradesOnly]);

  const fetchNextPage = useCallback(() => {
    if (thFilters.showCompleted) completedQuery.fetchNextPage();
    if (thFilters.showCancelled) cancelledQuery.fetchNextPage();
    if (thFilters.showPending) pendingQuery.fetchNextPage();
  }, [
    thFilters.showCompleted,
    thFilters.showCancelled,
    thFilters.showPending,
    completedQuery,
    cancelledQuery,
    pendingQuery,
  ]);

  const hasNextPage = buildNextPageState(
    thFilters,
    !!completedQuery.hasNextPage,
    !!cancelledQuery.hasNextPage,
    !!pendingQuery.hasNextPage,
  );
  const isFetchingNextPage = buildIsFetching(
    completedQuery.isFetchingNextPage,
    cancelledQuery.isFetchingNextPage,
    pendingQuery.isFetchingNextPage,
  );
  const isLoading = buildLoadingState(
    thFilters,
    completedQuery.isLoading,
    cancelledQuery.isLoading,
    pendingQuery.isLoading,
    orderBookLoading,
  );
  const error =
    completedQuery.error ??
    cancelledQuery.error ??
    pendingQuery.error ??
    orderBookError;

  return {
    offers,
    isLoading,
    error,
    hasPairFilter,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
}

export type TradeHistoryResult = ReturnType<typeof useTradeHistory>;
