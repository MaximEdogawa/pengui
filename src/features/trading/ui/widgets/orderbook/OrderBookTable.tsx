"use client";

import { useThemeClasses } from "@/shared/hooks";
import { useCatTokens } from "@/entities/asset";
import { getNativeTokenTickerForNetwork } from "@/shared/lib/config/environment";
import { useNetwork } from "@/shared/hooks/useNetwork";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OrderBookOrder } from "@/features/trading/lib/orderBookTypes";
import {
  formatAmountForDisplay,
  formatAmountForTooltip,
  formatPriceForDisplay,
} from "@/features/trading/lib/formatAmount";
import { calculateOrderPrice as calculateOrderPriceNumeric } from "@/features/trading/lib/services/priceCalculation";

interface OrderBookTableProps {
  orders: OrderBookOrder[];
  orderType: "buy" | "sell";
  filters?: {
    buyAsset?: string[];
    sellAsset?: string[];
  };
  onClick: (order: OrderBookOrder) => void;
  onHover: (
    event: React.MouseEvent,
    order: OrderBookOrder,
    orderType: "buy" | "sell",
  ) => void;
  onMouseLeave: () => void;
  detailsMap?: Map<
    string,
    {
      offerString?: string;
      fullMakerAddress?: string;
    }
  >;
  registerElement?: (orderId: string, element: HTMLElement | null) => void;
  isLoadingDetails?: boolean;
  stickyHeader?: boolean;
  emptyMessage?: string;
  className?: string;
  isLoading?: boolean;
  error?: Error | null;
  hasMore?: boolean;
  totalOrders?: number;
  justifyEnd?: boolean;
  showHeader?: boolean;
  myOfferIds?: Set<string>;
}

const isSingleAssetPair = (order: OrderBookOrder): boolean => {
  return order.offering.length === 1 && order.requesting.length === 1;
};

// Helper function to get price header ticker
const getPriceHeaderTicker = (
  filters?: { buyAsset?: string[]; sellAsset?: string[] },
  network: "mainnet" | "testnet" = "mainnet",
): string => {
  if (filters?.buyAsset && filters.buyAsset.length > 0) {
    return filters.buyAsset[0];
  }
  if (filters?.sellAsset && filters.sellAsset.length > 0) {
    return filters.sellAsset[0];
  }
  return getNativeTokenTickerForNetwork(network);
};

// Helper to create calculateOrderPrice function
const createCalculateOrderPrice = (
  getTickerSymbol: (assetId: string, code?: string) => string,
  filters?: { buyAsset?: string[]; sellAsset?: string[] },
) => {
  return (order: OrderBookOrder): string => {
    if (isSingleAssetPair(order)) {
      const requestingAsset = order.requesting[0];
      const offeringAsset = order.offering[0];

      if (
        requestingAsset &&
        offeringAsset &&
        requestingAsset.amount > 0 &&
        offeringAsset.amount > 0
      ) {
        let price;

        if (
          filters?.buyAsset &&
          filters.buyAsset.length > 0 &&
          filters?.sellAsset &&
          filters.sellAsset.length > 0
        ) {
          const requestingIsBuyAsset = filters.buyAsset.some(
            (filterAsset) =>
              getTickerSymbol(
                requestingAsset.id,
                requestingAsset.code,
              ).toLowerCase() === filterAsset.toLowerCase() ||
              requestingAsset.id.toLowerCase() === filterAsset.toLowerCase() ||
              (requestingAsset.code &&
                requestingAsset.code.toLowerCase() ===
                  filterAsset.toLowerCase()),
          );

          const offeringIsBuyAsset = filters.buyAsset.some(
            (filterAsset) =>
              getTickerSymbol(
                offeringAsset.id,
                offeringAsset.code,
              ).toLowerCase() === filterAsset.toLowerCase() ||
              offeringAsset.id.toLowerCase() === filterAsset.toLowerCase() ||
              (offeringAsset.code &&
                offeringAsset.code.toLowerCase() === filterAsset.toLowerCase()),
          );

          if (requestingIsBuyAsset && !offeringIsBuyAsset) {
            price = requestingAsset.amount / offeringAsset.amount;
          } else if (offeringIsBuyAsset && !requestingIsBuyAsset) {
            price = offeringAsset.amount / requestingAsset.amount;
          } else {
            price = offeringAsset.amount / requestingAsset.amount;
          }

          return formatPriceForDisplay(price);
        } else {
          price = offeringAsset.amount / requestingAsset.amount;
          return formatPriceForDisplay(price);
        }
      }
    }

    return `$${order.offeringUsdValue.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };
};

// Helper to calculate best price
const calculateBestPrice = (
  orders: OrderBookOrder[],
  orderType: "buy" | "sell",
  getNumericPrice: (order: OrderBookOrder) => number,
): number | null => {
  if (orders.length === 0) return null;

  const prices = orders
    .map(getNumericPrice)
    .filter((price) => price > 0 && isFinite(price) && !isNaN(price));

  if (prices.length === 0) return null;
  if (prices.length === 1) return prices[0];

  if (orderType === "sell") {
    const minPrice = Math.min(...prices);
    return isFinite(minPrice) && !isNaN(minPrice) ? minPrice : null;
  } else {
    const maxPrice = Math.max(...prices);
    return isFinite(maxPrice) && !isNaN(maxPrice) ? maxPrice : null;
  }
};

// Helper to create price count map
const createPriceCountMap = (
  orders: OrderBookOrder[],
  getNumericPrice: (order: OrderBookOrder) => number,
): Map<string, number> => {
  const countMap = new Map<string, number>();

  const normalizePrice = (price: number): string => {
    if (!isFinite(price) || isNaN(price) || price <= 0) return "";
    return price.toFixed(8);
  };

  orders.forEach((order) => {
    const numericPrice = getNumericPrice(order);
    const normalizedPrice = normalizePrice(numericPrice);

    if (normalizedPrice) {
      const currentCount = countMap.get(normalizedPrice) || 0;
      countMap.set(normalizedPrice, currentCount + 1);
    }
  });

  return countMap;
};

export default function OrderBookTable({
  orders,
  orderType,
  filters,
  onClick,
  onHover,
  onMouseLeave,
  detailsMap,
  registerElement,
  isLoadingDetails,
  stickyHeader = true,
  emptyMessage = "No orders available",
  className = "",
  isLoading = false,
  error = null,
  hasMore,
  totalOrders,
  justifyEnd = false,
  showHeader = true,
  myOfferIds,
}: OrderBookTableProps) {
  const { t } = useThemeClasses();
  const { getCatTokenInfo } = useCatTokens();
  const { network } = useNetwork();

  const getTickerSymbol = useCallback(
    (assetId: string, code?: string): string => {
      if (code) return code;
      if (!assetId) return getNativeTokenTickerForNetwork(network);
      const tickerInfo = getCatTokenInfo(assetId);
      return tickerInfo?.ticker || assetId.slice(0, 8);
    },
    [getCatTokenInfo, network],
  );

  const calculateOrderPrice = useCallback(
    (order: OrderBookOrder) =>
      createCalculateOrderPrice(getTickerSymbol, filters)(order),
    [filters, getTickerSymbol],
  );

  const textColorClass =
    orderType === "sell"
      ? "text-red-600 dark:text-red-400"
      : "text-green-600 dark:text-green-400";

  // Calculate numeric price for an order (for comparison)
  const getNumericPrice = useCallback(
    (order: OrderBookOrder): number => {
      return calculateOrderPriceNumeric(order, filters, { getTickerSymbol });
    },
    [filters, getTickerSymbol],
  );

  const bestPrice = useMemo(
    () => calculateBestPrice(orders, orderType, getNumericPrice),
    [orders, orderType, getNumericPrice],
  );

  const priceCountMap = useMemo(
    () => createPriceCountMap(orders, getNumericPrice),
    [orders, getNumericPrice],
  );

  // ── New-order highlight animation ────────────────────────────────────
  // Track order IDs we've already seen so we can detect genuinely new rows
  // (e.g. streamed in via WebSocket) and give them a brief fade-in highlight.
  const hasSeenDataRef = useRef(false);
  const prevOrderIdsRef = useRef<Set<string>>(new Set());
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = new Set(orders.map((o) => o.id).filter(Boolean));

    // First batch of data → record IDs without highlighting
    if (!hasSeenDataRef.current) {
      if (currentIds.size > 0) {
        hasSeenDataRef.current = true;
        prevOrderIdsRef.current = currentIds;
      }
      return;
    }

    // Detect IDs that weren't in the previous set
    const freshIds: string[] = [];
    for (const id of currentIds) {
      if (id && !prevOrderIdsRef.current.has(id)) freshIds.push(id);
    }
    prevOrderIdsRef.current = currentIds;

    if (freshIds.length > 0) {
      setNewOrderIds((prev) => {
        const merged = new Set(prev);
        for (const id of freshIds) merged.add(id);
        return merged;
      });
      // Remove the flag after the CSS animation finishes (2s + small buffer)
      const timer = setTimeout(() => {
        setNewOrderIds((prev) => {
          const next = new Set(prev);
          for (const id of freshIds) next.delete(id);
          return next;
        });
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [orders]);

  return (
    <div className={`w-full ${className}`}>
      {/* Keyframes for the new-order highlight animation (rendered once) */}
      <style>{`
        @keyframes obNewBuy {
          0%   { background-color: rgba(34,197,94,0.35); box-shadow: inset 0 0 12px rgba(34,197,94,0.25), 0 0 8px rgba(34,197,94,0.15); opacity: 0; transform: translateX(-6px); }
          15%  { opacity: 1; transform: translateX(0); }
          40%  { background-color: rgba(34,197,94,0.18); box-shadow: inset 0 0 6px rgba(34,197,94,0.12), 0 0 4px rgba(34,197,94,0.08); }
          100% { background-color: transparent; box-shadow: none; opacity: 1; transform: translateX(0); }
        }
        @keyframes obNewSell {
          0%   { background-color: rgba(239,68,68,0.35); box-shadow: inset 0 0 12px rgba(239,68,68,0.25), 0 0 8px rgba(239,68,68,0.15); opacity: 0; transform: translateX(-6px); }
          15%  { opacity: 1; transform: translateX(0); }
          40%  { background-color: rgba(239,68,68,0.18); box-shadow: inset 0 0 6px rgba(239,68,68,0.12), 0 0 4px rgba(239,68,68,0.08); }
          100% { background-color: transparent; box-shadow: none; opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div
        className={`${justifyEnd ? "flex flex-col justify-end min-h-full" : ""}`}
      >
        {isLoading && (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400 dark:text-gray-500" />
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
              Loading orders...
            </span>
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-xs text-gray-500 dark:text-gray-400">
            Error loading orders. Please try again.
          </div>
        )}

        {!isLoading && !error && (
          <>
            {showHeader && (
              <div
                className={`grid grid-cols-12 gap-1 sm:gap-2 px-1.5 sm:px-2 py-1 backdrop-blur-xl ${t.card} border-b ${t.border} text-[9px] sm:text-[10px] font-medium ${t.textSecondary} ${
                  stickyHeader ? "sticky top-0 z-10 shadow-sm" : ""
                }`}
                style={
                  stickyHeader
                    ? {
                        boxShadow:
                          "0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)",
                      }
                    : undefined
                }
              >
                <div className="col-span-1 text-left flex items-center">
                  Count
                </div>
                <div className="col-span-3 text-right flex items-center justify-end">
                  Buy
                </div>
                <div className="col-span-3 text-right flex items-center justify-end">
                  Sell
                </div>
                <div className="col-span-5 text-right flex items-center justify-end">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] opacity-70">
                      ({getPriceHeaderTicker(filters, network)})
                    </span>
                    <span className="font-mono">Price</span>
                  </div>
                </div>
              </div>
            )}

            {/* Rows */}
            {orders.length === 0 ? (
              <div className="px-2 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                {emptyMessage}
              </div>
            ) : (
              <div className="relative">
                {orders.map((order) => (
                  <OrderBookTableRow
                    key={order.id}
                    order={order}
                    orderType={orderType}
                    filters={filters}
                    onClick={onClick}
                    onHover={onHover}
                    onMouseLeave={onMouseLeave}
                    detailedData={detailsMap?.get(order.id)}
                    registerElement={registerElement}
                    isLoadingDetails={isLoadingDetails}
                    calculateOrderPrice={calculateOrderPrice}
                    getTickerSymbol={getTickerSymbol}
                    textColorClass={textColorClass}
                    bestPrice={bestPrice}
                    getNumericPrice={getNumericPrice}
                    priceCountMap={priceCountMap}
                    isNew={newOrderIds.has(order.id)}
                    isMine={myOfferIds?.has(order.id) ?? false}
                  />
                ))}
              </div>
            )}

            {!hasMore && totalOrders && totalOrders > 0 && (
              <div className="text-right py-4 text-xs text-gray-400 dark:text-gray-500">
                No more orders
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface OrderBookTableHeaderProps {
  filters?: {
    buyAsset?: string[];
    sellAsset?: string[];
  };
}

export function OrderBookTableHeader({ filters }: OrderBookTableHeaderProps) {
  const { network } = useNetwork();

  const getPriceHeaderTicker = (): string => {
    if (filters?.buyAsset && filters.buyAsset.length > 0) {
      return filters.buyAsset[0];
    }
    if (filters?.sellAsset && filters.sellAsset.length > 0) {
      return filters.sellAsset[0];
    }
    return getNativeTokenTickerForNetwork(network);
  };

  return (
    <div className="grid grid-cols-12 gap-1 sm:gap-2 px-1.5 sm:px-2 py-1.5 sm:py-2 backdrop-blur-xl bg-gradient-to-b from-white/5 to-transparent dark:from-black/5 dark:to-transparent border-b border-white/10 dark:border-white/5">
      {/* Count */}
      <div className="col-span-1 text-left flex items-center font-medium text-[9px] sm:text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Count
      </div>

      {/* Buy */}
      <div className="col-span-3 text-right flex items-center justify-end font-medium text-[9px] sm:text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 pr-0 sm:pr-[17px]">
        Buy
      </div>

      {/* Sell */}
      <div className="col-span-3 text-right flex items-center justify-end font-medium text-[9px] sm:text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 pr-0 sm:pr-[17px]">
        Sell
      </div>

      {/* Price */}
      <div className="col-span-5 text-right flex items-center justify-end pr-0 sm:pr-[17px]">
        <div className="flex items-center gap-1 sm:gap-1.5">
          <span className="text-[8px] sm:text-[9px] opacity-40 font-normal text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate max-w-[60px] sm:max-w-none">
            ({getPriceHeaderTicker()})
          </span>
          <span className="font-medium text-[9px] sm:text-[10px] uppercase tracking-wider text-gray-600 dark:text-gray-300">
            Price
          </span>
        </div>
      </div>
    </div>
  );
}

interface OrderBookTableRowProps {
  order: OrderBookOrder;
  orderType: "buy" | "sell";
  filters?: {
    buyAsset?: string[];
    sellAsset?: string[];
  };
  onClick: (order: OrderBookOrder) => void;
  onHover: (
    event: React.MouseEvent,
    order: OrderBookOrder,
    orderType: "buy" | "sell",
  ) => void;
  onMouseLeave: () => void;
  detailedData?: {
    offerString?: string;
    fullMakerAddress?: string;
  };
  registerElement?: (orderId: string, element: HTMLElement | null) => void;
  isLoadingDetails?: boolean;
  calculateOrderPrice: (order: OrderBookOrder) => string;
  getTickerSymbol: (assetId: string, code?: string) => string;
  textColorClass: string;
  bestPrice: number | null;
  getNumericPrice: (order: OrderBookOrder) => number;
  priceCountMap: Map<string, number>;
  isNew?: boolean;
  isMine?: boolean;
}

function OrderBookTableRow({
  order,
  orderType,
  filters,
  onClick,
  onHover,
  onMouseLeave,
  detailedData,
  registerElement,
  isLoadingDetails,
  calculateOrderPrice,
  getTickerSymbol,
  textColorClass,
  bestPrice,
  getNumericPrice,
  priceCountMap,
  isNew,
  isMine,
}: OrderBookTableRowProps) {
  // Calculate price deviation percentage from best price
  const priceDeviationPercent = useMemo(() => {
    // Handle edge cases: no best price, invalid prices
    if (!bestPrice || bestPrice <= 0 || !isFinite(bestPrice)) return 0;

    const currentPrice = getNumericPrice(order);

    // Handle edge cases: invalid current price
    if (!currentPrice || currentPrice <= 0 || !isFinite(currentPrice)) return 0;

    // If prices are exactly equal, return 0% deviation
    if (currentPrice === bestPrice) return 0;

    let deviation: number;

    if (orderType === "sell") {
      // For sell orders: ((currentPrice - bestPrice) / bestPrice) * 100
      // Best price is lowest, so higher prices have higher deviation
      deviation = ((currentPrice - bestPrice) / bestPrice) * 100;
    } else {
      // For buy orders: ((bestPrice - currentPrice) / bestPrice) * 100
      // Best price is highest, so lower prices have higher deviation
      deviation = ((bestPrice - currentPrice) / bestPrice) * 100;
    }

    // Handle NaN or Infinity results
    if (!isFinite(deviation) || isNaN(deviation)) return 0;

    // Cap at 100% and ensure non-negative
    return Math.max(0, Math.min(100, deviation));
  }, [order, bestPrice, orderType, getNumericPrice]);

  // Register element for viewport detection
  const rowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (registerElement && rowRef.current) {
      registerElement(order.id, rowRef.current);
    }
    return () => {
      if (registerElement) {
        registerElement(order.id, null);
      }
    };
  }, [order.id, registerElement]);

  // Calculate background width based on price deviation (0% = no background, 100% = full width)
  // This uses the same approach as the previous depthWidth but with price-based calculation
  const backgroundWidth = useMemo(() => {
    // Ensure width is between 0% and 100%
    return `${Math.max(0, Math.min(100, priceDeviationPercent))}%`;
  }, [priceDeviationPercent]);

  // Background color classes - red for sell, green for buy
  const bgColorClass =
    orderType === "sell"
      ? "bg-red-500/8 dark:bg-red-500/15 backdrop-blur-sm group-hover:bg-red-500/12 dark:group-hover:bg-red-500/20"
      : "bg-green-500/8 dark:bg-green-500/15 backdrop-blur-sm group-hover:bg-green-500/12 dark:group-hover:bg-green-500/20";

  return (
    <div
      ref={rowRef}
      className={`w-full group relative mb-0.5 cursor-pointer transition-all duration-200${isMine ? " ring-1 ring-inset ring-blue-400/40 dark:ring-blue-400/30" : ""}`}
      style={{
        ...(isNew
          ? { animation: `${orderType === "buy" ? "obNewBuy" : "obNewSell"} 2s cubic-bezier(0.22, 1, 0.36, 1) forwards` }
          : {}),
      }}
      onClick={() => onClick(order)}
      onMouseMove={(e) => onHover(e, order, orderType)}
      onMouseLeave={onMouseLeave}
    >
      {/* "Mine" left accent bar */}
      {isMine && (
        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-blue-400 dark:bg-blue-400 rounded-full z-10" />
      )}

      {/* Dynamic background based on price deviation - width scales from 0% to 100%, fills from right to left */}
      <div
        className={`absolute right-0 top-0 bottom-0 ${bgColorClass} transition-all duration-300`}
        style={{
          width: backgroundWidth,
        }}
      />

      {/* Mine background tint */}
      {isMine && (
        <div className="absolute inset-0 bg-blue-400/[0.06] dark:bg-blue-400/[0.08]" />
      )}

      <div className="relative grid grid-cols-12 gap-1 sm:gap-2 px-1.5 sm:px-2 py-1.5 items-center">
        {/* Count - smallest, left aligned */}
        <div className="col-span-1 text-left text-gray-600 dark:text-gray-400 font-mono text-[9px] sm:text-[10px]">
          {(() => {
            const numericPrice = getNumericPrice(order);
            // Normalize price for lookup (round to 8 decimal places)
            const normalizedPrice =
              isFinite(numericPrice) && !isNaN(numericPrice) && numericPrice > 0
                ? numericPrice.toFixed(8)
                : "";
            const count = normalizedPrice
              ? priceCountMap.get(normalizedPrice) || 1
              : 1;
            return count;
          })()}
        </div>

        {/* Buy */}
        <div className="col-span-3 text-right flex items-center justify-end overflow-hidden">
          <div className="flex flex-col gap-0.5 min-w-0 w-full">
            {order.offering.map((item, idx) => (
              <div
                key={idx}
                className={`${textColorClass} font-mono text-[9px] sm:text-[10px] flex items-center justify-end gap-0.5 sm:gap-1 min-w-0`}
                title={`${formatAmountForTooltip(item.amount || 0)} ${item.code || getTickerSymbol(item.id)}`}
              >
                <span className="text-right tabular-nums truncate">
                  {formatAmountForDisplay(item.amount || 0)}
                </span>
                <span className="flex-shrink-0">
                  {item.code || getTickerSymbol(item.id)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Sell */}
        <div className="col-span-3 text-right flex items-center justify-end overflow-hidden">
          <div className="flex flex-col gap-0.5 min-w-0 w-full">
            {order.requesting.map((item, idx) => (
              <div
                key={idx}
                className="text-[9px] sm:text-[10px] font-mono text-gray-600 dark:text-gray-300 flex items-center justify-end gap-0.5 sm:gap-1 min-w-0"
                title={`${formatAmountForTooltip(item.amount || 0)} ${item.code || getTickerSymbol(item.id)}`}
              >
                <span className="text-right tabular-nums truncate">
                  {formatAmountForDisplay(item.amount || 0)}
                </span>
                <span className="flex-shrink-0">
                  {item.code || getTickerSymbol(item.id)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Price - biggest, right aligned */}
        <div className="col-span-5 text-right text-gray-700 dark:text-gray-300 font-mono text-[9px] sm:text-[10px] overflow-hidden">
          <div className="flex items-center justify-end min-w-0 gap-1">
            {isMine && (
              <span className="flex-shrink-0 inline-flex items-center px-1 py-[1px] rounded text-[7px] sm:text-[8px] font-semibold uppercase tracking-wider leading-none bg-blue-500/15 dark:bg-blue-400/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 dark:border-blue-400/20">
                Mine
              </span>
            )}
            {isLoadingDetails && !detailedData && (
              <Loader2 className="w-3 h-3 animate-spin text-gray-400 mr-1 flex-shrink-0" />
            )}
            <span className="tabular-nums truncate" title={calculateOrderPrice(order)}>
              {calculateOrderPrice(order)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
