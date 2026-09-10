"use client";

import { useCatTokens } from "@/entities/asset";
import { getNativeTokenTickerForNetwork } from "@/shared/lib/config/environment";
import { useNetwork } from "@/shared/hooks/useNetwork";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import OrderBookResizeHandle from "./OrderBookResizeHandle";
import OrderBookTable, { OrderBookTableHeader } from "./OrderBookTable";
import OrderTooltip from "./OrderTooltip";
import { User } from "lucide-react";
import { useThemeClasses } from "@/shared/hooks";
import { OrderBookOrder } from "@/features/trading/lib/orderBookTypes";
import { useOrderBookFilters } from "@/features/trading/hooks/OrderBookFiltersProvider";
import { useOrderBook } from "@/features/trading/hooks/useOrderBook";
import { useTickers } from "@/entities/asset/hooks/useTickers";
import { useOrderBookDetails } from "@/features/trading/hooks/useOrderBookDetails";
import { calculateAveragePrice } from "@/features/trading/lib/services/priceCalculation";
import { formatPriceForDisplay } from "@/features/trading/lib/formatAmount";
import { useMyTrades } from "@/features/trading/hooks/useMyTrades";
import { resolveTickerId } from "@/features/trading/lib/tickerResolution";
import { useWalletAddress } from "@/features/wallet/hooks/useWalletQueries";
import { offerStorageService } from "@/shared/lib/services/offerStorageService";
import { useOrderBookFiltering } from "@/features/trading/composables/useOrderBookFiltering";
import { useOrderBookPriceDeviation } from "@/features/trading/composables/useOrderBookPriceDeviation";
import { useOrderBookResize } from "@/features/trading/composables/useOrderBookResize";
import { useOrderBookScroll } from "@/features/trading/composables/useOrderBookScroll";
import { useOrderBookTooltip } from "@/features/trading/composables/useOrderBookTooltip";
import { useOrderBookViewport } from "@/features/trading/composables/useOrderBookViewport";

interface OrderBookContainerProps {
  filters?: {
    buyAsset?: string[];
    sellAsset?: string[];
  };
  onOrderClick: (order: OrderBookOrder) => void;
}

export default function OrderBookContainer({ filters, onOrderClick }: OrderBookContainerProps) {
  const { filters: contextFilters } = useOrderBookFilters();
  const { t, isDark } = useThemeClasses();

  const { orderBookData, orderBookLoading, orderBookHasMore, orderBookError } =
    useOrderBook(contextFilters);

  const { getCatTokenInfo } = useCatTokens();
  const { network } = useNetwork();
  const { data: tickersData } = useTickers();
  const { data: walletData } = useWalletAddress();

  // ── My-offer identification ────────────────────────────────────────
  const [myOfferIds, setMyOfferIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const addr = walletData?.address;
    if (!addr) {
      setMyOfferIds(new Set());
      return;
    }
    offerStorageService
      .getMyOfferIds(addr, network)
      .then(setMyOfferIds)
      .catch(() => setMyOfferIds(new Set()));
    // Only refetch when address or network changes; orderBookData is unstable and caused infinite loop
  }, [walletData?.address, network]);
  const tickers = useMemo(() => tickersData?.data || [], [tickersData?.data]);

  // Get ticker ID for my trades
  const tickerId = useMemo(() => {
    if (!contextFilters) return null;
    return resolveTickerId(contextFilters, tickers);
  }, [contextFilters, tickers]);

  // Get my trades for current asset pair
  const { myTrades } = useMyTrades({
    tickerId: tickerId || undefined,
  });

  // Check if user has trades for this asset pair
  const hasMyTrades = useMemo(() => {
    return myTrades.length > 0;
  }, [myTrades]);

  const { filteredBuyOrders, filteredSellOrders, calculatePriceFn } = useOrderBookFiltering(
    orderBookData,
    contextFilters
  );

  const { sellSectionHeight, buySectionHeight, startResize } = useOrderBookResize();

  const { hoveredOrder, tooltipPosition, tooltipVisible, updateTooltipPosition, hideTooltip } =
    useOrderBookTooltip();

  // Helper function to get ticker symbol
  const getTickerSymbol = useCallback(
    (assetId: string, code?: string): string => {
      if (code) return code;
      if (!assetId) return getNativeTokenTickerForNetwork(network);
      const tickerInfo = getCatTokenInfo(assetId);
      return tickerInfo?.ticker || assetId.slice(0, 8);
    },
    [getCatTokenInfo, network]
  );

  // Calculate price deviation percentage for hovered order
  const priceDeviationPercent = useOrderBookPriceDeviation({
    hoveredOrder,
    filteredBuyOrders,
    filteredSellOrders,
    contextFilters,
    getTickerSymbol,
  });

  // Refs for scrolling
  const sellScrollRef = useRef<HTMLDivElement>(null);
  const buyScrollRef = useRef<HTMLDivElement>(null);

  // Viewport detection for lazy loading detailed data
  const { visibleOrderIds, registerOrderElement } = useOrderBookViewport(
    filteredSellOrders,
    filteredBuyOrders,
    sellScrollRef,
    buyScrollRef
  );

  // Fetch detailed data for visible orders only
  const { detailsMap, isLoading: isLoadingDetails } = useOrderBookDetails(visibleOrderIds);

  // Handle scroll behavior (auto-scroll, position restoration, infinite scroll)
  useOrderBookScroll({
    sellScrollRef,
    buyScrollRef,
    filteredSellOrders,
    orderBookLoading,
    orderBookHasMore,
  });

  // Calculate average price
  const averagePrice = useMemo(() => {
    if (
      !contextFilters ||
      (!contextFilters.buyAsset?.length && !contextFilters.sellAsset?.length)
    ) {
      return "N/A";
    }

    const bestSellOrder = filteredSellOrders[filteredSellOrders.length - 1];
    const bestBuyOrder = filteredBuyOrders[0];

    return calculateAveragePrice(
      bestSellOrder,
      bestBuyOrder,
      calculatePriceFn,
      formatPriceForDisplay
    );
  }, [contextFilters, filteredSellOrders, filteredBuyOrders, calculatePriceFn]);

  const emptyMessage = useMemo(() => {
    if (
      contextFilters &&
      ((contextFilters.buyAsset && contextFilters.buyAsset.length > 0) ||
        (contextFilters.sellAsset && contextFilters.sellAsset.length > 0))
    ) {
      return "No orders found matching your filters. Try adjusting your filters.";
    }
    return "No orders found. Add filters to see orders.";
  }, [contextFilters]);

  const handleOrderClick = (order: OrderBookOrder) => {
    onOrderClick(order);
  };

  return (
    <div className="h-full flex flex-col">
      {/* My Trades Indicator */}
      {hasMyTrades && (
        <div
          className={`mb-2 flex items-center gap-1.5 px-2 py-1 backdrop-blur-xl bg-blue-500/20 border border-blue-400/30 rounded-lg ${t.card}`}
        >
          <User className={`w-3 h-3 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
          <span className={`text-xs font-medium ${isDark ? "text-blue-400" : "text-blue-600"}`}>
            {myTrades.length} {myTrades.length === 1 ? "Trade" : "Trades"} for this pair
          </span>
        </div>
      )}

      {/* Order Book Display */}
      <div
        className="order-book-container flex-1 flex flex-col overflow-hidden rounded-xl backdrop-blur-2xl bg-white/5 dark:bg-black/5 border border-white/15"
        style={{
          boxShadow:
            "0 0 0 1px rgba(255, 255, 255, 0.08), 0 0 30px rgba(255, 255, 255, 0.03), 0 2px 8px rgba(0, 0, 0, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Header - Fixed at top, outside scrollable sections */}
        <div>
          <OrderBookTableHeader filters={contextFilters} />
        </div>

        {/* Sell Orders Section */}
        <div
          ref={sellScrollRef}
          className="overflow-y-scroll sell-orders-section scrollbar-thin scrollbar-thumb-gray-300/30 dark:scrollbar-thumb-gray-600/30 scrollbar-track-transparent"
          style={{
            height: `${sellSectionHeight}%`,
          }}
        >
          <OrderBookTable
            orders={filteredSellOrders}
            orderType="sell"
            filters={contextFilters}
            onClick={handleOrderClick}
            onHover={updateTooltipPosition}
            onMouseLeave={hideTooltip}
            detailsMap={detailsMap}
            registerElement={registerOrderElement}
            isLoadingDetails={isLoadingDetails}
            isLoading={orderBookLoading}
            error={orderBookError}
            justifyEnd
            showHeader={false}
            myOfferIds={myOfferIds}
          />
        </div>

        {/* Resize Handle / Market Price Separator */}
        <OrderBookResizeHandle averagePrice={averagePrice} onMouseDown={startResize} />

        {/* Buy Orders Section */}
        <div
          ref={buyScrollRef}
          className="overflow-y-scroll buy-orders-section scrollbar-thin scrollbar-thumb-gray-300/30 dark:scrollbar-thumb-gray-600/30 scrollbar-track-transparent"
          style={{ height: `${buySectionHeight}%` }}
        >
          <OrderBookTable
            orders={filteredBuyOrders}
            orderType="buy"
            filters={contextFilters}
            onClick={handleOrderClick}
            onHover={updateTooltipPosition}
            onMouseLeave={hideTooltip}
            detailsMap={detailsMap}
            registerElement={registerOrderElement}
            isLoadingDetails={isLoadingDetails}
            isLoading={orderBookLoading}
            error={orderBookError}
            hasMore={orderBookHasMore}
            totalOrders={orderBookData.length}
            emptyMessage={emptyMessage}
            showHeader={false}
            myOfferIds={myOfferIds}
          />
        </div>
      </div>

      {/* Order Tooltip */}
      <OrderTooltip
        order={hoveredOrder}
        visible={tooltipVisible}
        position={tooltipPosition}
        direction={hoveredOrder && filteredBuyOrders.includes(hoveredOrder) ? "top" : "bottom"}
        priceDeviationPercent={priceDeviationPercent}
      />
    </div>
  );
}
