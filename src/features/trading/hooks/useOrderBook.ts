"use client";

import { useDexieDataService } from "@/features/offers/api/useDexieDataService";
import type { DexieOffer } from "@/entities/offer";
import { logger } from "@/shared/lib/logger";
import { useNetwork } from "@/shared/hooks/useNetwork";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type {
  OrderBookFilters,
  OrderBookOrder,
  OrderBookPagination,
  OrderBookQueryResult,
} from "../lib/orderBookTypes";
import { convertDexieOfferToOrderBookOrder as _convertDexieOfferToOrderBookOrder } from "../lib/orderBookConverters";
import { executeOrderBookQuery } from "../lib/orderBookQuery";
import { calculateRefetchInterval, calculateStaleTime } from "../lib/orderBookConfig";
import { buildOrderBookSearchParams } from "../lib/orderBookParams";
import { useSplashConnection } from "@/features/splash-terminal/SplashConnectionProvider";
import { offerMatchesPairFilter } from "../lib/offerPairFilter";
import { deduplicateOrders, sortOrdersByPrice } from "../lib/orderBookSorting";

const DEFAULT_PAGINATION: OrderBookPagination = 50;

export interface UseOrderBookOptions {
  /** Separate query key (e.g. 'chart') so this consumer has its own snapshot; only runs when this hook is mounted. */
  queryKeySuffix?: string;
}

/**
 * Hook for order book data: one snapshot from Dexie + live stream from Splash.
 *
 * - **Dexie snapshot**: Fetched once per filter/pagination (or on page refresh).
 *   When the Splash stream is connected, we stop refetching Dexie; the snapshot
 *   is the baseline.
 * - **Combined order book**: Snapshot orders + offers received via Splash stream
 *   (filtered by current pair, deduped by id). Use this for the order book UI,
 *   depth chart, and any other consumer.
 *
 * Pass `options.queryKeySuffix: 'chart'` for the price chart so it uses a
 * separate query that only runs when the Chart tab is open.
 */
export function useOrderBook(filters?: OrderBookFilters, options?: UseOrderBookOptions) {
  const dexieDataService = useDexieDataService();
  const { network } = useNetwork();
  const splash = useSplashConnection();
  const [streamOrders, setStreamOrders] = useState<OrderBookOrder[]>([]);

  const streamActive = splash.status === "connected";

  // Log filters on mount and when they change (debug only, minimal data)
  useEffect(() => {
    logger.debug("useOrderBook filters changed:", {
      hasBuyAsset: !!filters?.buyAsset?.length,
      hasSellAsset: !!filters?.sellAsset?.length,
      buyAssetCount: filters?.buyAsset?.length || 0,
      sellAssetCount: filters?.sellAsset?.length || 0,
      pagination: filters?.pagination || DEFAULT_PAGINATION,
    });
  }, [filters]);

  // Create converter function with network context
  const convertDexieOfferToOrderBookOrderWithNetwork = (dexieOffer: DexieOffer): OrderBookOrder => {
    return _convertDexieOfferToOrderBookOrder(dexieOffer, network);
  };

  // Get pagination value from filters or use default
  const pagination = filters?.pagination || DEFAULT_PAGINATION;

  // Helper function to build search parameters based on filters
  const buildSearchParams = (
    page: number,
    buyAsset?: string | null,
    sellAsset?: string | null,
    pageSize?: number
  ) => {
    return buildOrderBookSearchParams({
      page,
      pagination,
      network,
      buyAsset,
      sellAsset,
      filters,
      pageSize,
    });
  };

  // Helper function to fetch all pages recursively
  interface FetchAllPagesOptions {
    buyAsset?: string | null;
    sellAsset?: string | null;
    page?: number;
    accumulatedOrders?: OrderBookOrder[];
    accumulatedTotal?: number;
  }

  const fetchAllPagesInternal = async (
    options: FetchAllPagesOptions = {}
  ): Promise<{ orders: OrderBookOrder[]; total: number }> => {
    const { buyAsset, sellAsset, page = 0, accumulatedOrders = [], accumulatedTotal = 0 } = options;

    const params = buildSearchParams(page, buyAsset, sellAsset, 100);
    const response = await dexieDataService.searchOffers(params);

    if (response.success && Array.isArray(response.data)) {
      const orders = (response.data as DexieOffer[])
        .filter((offer: DexieOffer) => offer && offer.offered && offer.requested)
        .map(convertDexieOfferToOrderBookOrderWithNetwork);

      const newOrders = [...accumulatedOrders, ...orders];
      const newTotal = response.total != null ? response.total : accumulatedTotal + orders.length;

      if (response.data.length === 100) {
        return fetchAllPagesInternal({
          buyAsset,
          sellAsset,
          page: page + 1,
          accumulatedOrders: newOrders,
          accumulatedTotal: newTotal,
        });
      }

      return { orders: newOrders, total: newTotal };
    }

    return { orders: accumulatedOrders, total: accumulatedTotal };
  };

  // Wrapper function that matches the expected type signature
  const fetchAllPages = async (options?: {
    buyAsset?: string | null;
    sellAsset?: string | null;
  }): Promise<{ orders: OrderBookOrder[]; total: number }> => {
    return fetchAllPagesInternal(options || {});
  };

  const queryKey = useMemo(() => {
    const buyAssets = filters?.buyAsset || [];
    const sellAssets = filters?.sellAsset || [];
    const buyKey = [...buyAssets].sort().join(",");
    const sellKey = [...sellAssets].sort().join(",");
    const parts: (string | number)[] = ["orderBook", buyKey, sellKey, pagination, network];
    if (options?.queryKeySuffix) {
      parts.splice(1, 0, options.queryKeySuffix);
    }
    return parts;
  }, [filters?.buyAsset, filters?.sellAsset, pagination, network, options?.queryKeySuffix]);

  // Subscribe to stream offers when connected and filters are set; merge later into query result
  useEffect(() => {
    // Reset stream orders whenever filters, network, or activation state change
    setStreamOrders([]);

    if (!streamActive) {
      return;
    }

    const buyAssets = filters?.buyAsset ?? [];
    const sellAssets = filters?.sellAsset ?? [];

    const unsubscribe = splash.onOffers((offers) => {
      if (!offers.length) return;

      const matching = offers.filter((o) => offerMatchesPairFilter(o, buyAssets, sellAssets));
      if (!matching.length) return;

      setStreamOrders((prev) => {
        const byId = new Map<string, OrderBookOrder>();
        for (const o of prev) {
          byId.set(o.id, o);
        }
        for (const dexieOffer of matching) {
          if (!dexieOffer.id) continue;
          const converted = convertDexieOfferToOrderBookOrderWithNetwork(dexieOffer);
          byId.set(converted.id, converted);
        }
        return Array.from(byId.values());
      });
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamActive, network, filters?.buyAsset, filters?.sellAsset]);

  /** Query: one-time snapshot of offers from Dexie Space API for current filters/pagination. */
  const dexieSnapshotQuery = useQuery<OrderBookQueryResult>({
    queryKey,
    queryFn: async () => {
      return executeOrderBookQuery({
        filters,
        pagination,
        network,
        buildSearchParams,
        fetchAllPages,
        searchOffers: dexieDataService.searchOffers,
        convertFn: convertDexieOfferToOrderBookOrderWithNetwork,
      });
    },
    staleTime: calculateStaleTime(pagination),
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    // Only refetch on interval if query is successful (prevents infinite loop on errors)
    refetchInterval: (query) => {
      if (streamActive) return false;
      if (query.state.status === "error") {
        return false; // Stop refetching on error
      }
      return calculateRefetchInterval(pagination);
    },
    refetchIntervalInBackground: !streamActive && pagination !== "all", // Continue refetching only if not "all" and stream inactive
    refetchOnMount: !streamActive, // Avoid extra Dexie fetch when stream is active
    refetchOnWindowFocus: !streamActive && pagination !== "all", // Refetch on focus only if not "all" and stream inactive
    refetchOnReconnect: !streamActive && pagination !== "all",
    retry: 3, // Max 3 retries for failed queries
  });

  /** Combined order book: Dexie snapshot + Splash stream offers (deduped, sorted). Use for UI and depth chart. */
  const orderBookData = useMemo(() => {
    const snapshotOrders = dexieSnapshotQuery.data?.orders ?? [];
    if (!streamActive || streamOrders.length === 0) {
      return snapshotOrders;
    }
    const merged = [...snapshotOrders, ...streamOrders];
    const deduped = deduplicateOrders(merged);
    return sortOrdersByPrice(deduped, network);
  }, [dexieSnapshotQuery.data, streamActive, streamOrders, network]);

  const orderBookLoading = dexieSnapshotQuery.isLoading;
  const orderBookError = dexieSnapshotQuery.error;
  const orderBookHasMore = dexieSnapshotQuery.data?.hasMore ?? false;
  const orderBookTotal = dexieSnapshotQuery.data?.total ?? 0;

  const refreshOrderBook = () => {
    dexieSnapshotQuery.refetch();
  };

  return {
    /** Combined orders (Dexie snapshot + Splash stream). Use for order book table, depth chart, etc. */
    orderBookData,
    orderBookTotal,
    orderBookLoading,
    orderBookError,
    orderBookHasMore,
    refreshOrderBook,
    /** Raw Dexie snapshot query (for advanced use). Prefer orderBookData for display. */
    orderBookQuery: dexieSnapshotQuery,
  };
}
