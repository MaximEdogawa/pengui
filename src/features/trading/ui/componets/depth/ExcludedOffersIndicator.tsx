"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { MarketDepthLevel } from "@/features/trading/lib/chartTypes";
import type { OrderBookOrder } from "@/features/trading/lib/orderBookTypes";
import { findOrderByPrice } from "@/features/trading/lib/utils/orderPriceMatching";
import { logger } from "@/shared/lib/logger";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { formatPriceForDisplay } from "@/features/trading/lib/formatAmount";

interface ExcludedOffersIndicatorProps {
  excludedBids?: MarketDepthLevel[];
  excludedAsks?: MarketDepthLevel[];
  onOrderClick?: (order: OrderBookOrder) => void;
  filteredBuyOrders?: OrderBookOrder[];
  filteredSellOrders?: OrderBookOrder[];
  calculatePriceFn?: (order: OrderBookOrder) => number;
}

export default function ExcludedOffersIndicator({
  excludedBids,
  excludedAsks,
  onOrderClick,
  filteredBuyOrders = [],
  filteredSellOrders = [],
  calculatePriceFn,
}: ExcludedOffersIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hasExcluded =
    (excludedBids && excludedBids.length > 0) ||
    (excludedAsks && excludedAsks.length > 0);

  // Find order matching a price level using shared utility
  const findOrder = useCallback(
    (price: number, isBid: boolean): OrderBookOrder | null => {
      const orders = isBid ? filteredBuyOrders : filteredSellOrders;
      return findOrderByPrice(price, orders, calculatePriceFn);
    },
    [filteredBuyOrders, filteredSellOrders, calculatePriceFn],
  );

  // Simple click handler
  const handleOfferClick = useCallback(
    (price: number, isBid: boolean) => {
      if (!onOrderClick) {
        logger.error("ExcludedOffersIndicator: onOrderClick is not available");
        return;
      }

      if (!calculatePriceFn) {
        logger.error(
          "ExcludedOffersIndicator: calculatePriceFn is not available",
        );
        return;
      }

      const order = findOrder(price, isBid);
      if (order && order.id) {
        onOrderClick(order);
        setIsOpen(false);
      } else {
        logger.error("ExcludedOffersIndicator: No valid order found", {
          price,
          isBid,
          orderFound: !!order,
          orderId: order?.id,
        });
      }
    },
    [onOrderClick, calculatePriceFn, findOrder],
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  if (!hasExcluded) return null;

  const totalExcluded =
    (excludedBids?.length || 0) + (excludedAsks?.length || 0);

  return (
    <div className="absolute top-2 right-2 z-20">
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg transition-all duration-150 text-xs text-amber-400"
        >
          <AlertTriangle className="w-4 h-4" />
          <span className="font-medium">{totalExcluded} Excluded</span>
          <ChevronDown
            className={`w-3 h-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute top-full right-0 mt-2 w-80 bg-[#1e222d] border border-white/10 rounded-lg shadow-2xl overflow-hidden z-30"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-h-96 overflow-y-auto">
              {excludedBids && excludedBids.length > 0 && (
                <div className="p-3 border-b border-white/10">
                  <div className="text-xs font-semibold text-[#868993] mb-2 uppercase tracking-wider">
                    Excluded Bids ({excludedBids.length})
                  </div>
                  <div className="space-y-1">
                    {excludedBids.map((bid, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleOfferClick(bid.price, true)}
                        className="w-full flex items-center justify-between text-xs py-1 px-2 rounded bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors cursor-pointer"
                      >
                        <span className="text-[#26a69a] font-mono">
                          {formatPriceForDisplay(bid.price)}
                        </span>
                        <span className="text-[#868993]">
                          {bid.quantity.toLocaleString()} ({bid.orderCount})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {excludedAsks && excludedAsks.length > 0 && (
                <div className="p-3">
                  <div className="text-xs font-semibold text-[#868993] mb-2 uppercase tracking-wider">
                    Excluded Asks ({excludedAsks.length})
                  </div>
                  <div className="space-y-1">
                    {excludedAsks.map((ask, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleOfferClick(ask.price, false)}
                        className="w-full flex items-center justify-between text-xs py-1 px-2 rounded bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors cursor-pointer"
                      >
                        <span className="text-[#ef5350] font-mono">
                          {formatPriceForDisplay(ask.price)}
                        </span>
                        <span className="text-[#868993]">
                          {ask.quantity.toLocaleString()} ({ask.orderCount})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
