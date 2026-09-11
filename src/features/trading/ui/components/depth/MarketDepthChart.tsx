"use client";

import { useMemo, useState, useCallback } from "react";
import type { MarketDepthData } from "@/features/trading/lib/chartTypes";
import type { OrderBookFilters, OrderBookOrder } from "@/features/trading/lib/orderBookTypes";
import { useDepthChartData, useMaxSpreadPercent } from "./useDepthChartData";
import { findOrderByPrice } from "@/features/trading/lib/utils/orderPriceMatching";
import SpreadControls from "./SpreadControls";
import DepthChartSVG from "./DepthChartSVG";
import DepthChartTooltip from "./DepthChartTooltip";
import ExcludedOffersIndicator from "./ExcludedOffersIndicator";

interface MarketDepthChartProps {
  depthData: MarketDepthData;
  filters?: OrderBookFilters;
  width?: number;
  height?: number;
  onPriceClick?: (price: number) => void;
  onOrderClick?: (order: OrderBookOrder) => void;
  filteredBuyOrders?: OrderBookOrder[];
  filteredSellOrders?: OrderBookOrder[];
  calculatePriceFn?: (order: OrderBookOrder) => number;
}

interface TooltipData {
  x: number;
  y: number;
  price: number;
  quantity: number;
  cumulativeVolume: number;
  side: "bid" | "ask";
}

const CHART_PADDING = { top: 5, right: 5, bottom: 40, left: 5 };
const SPREAD_INDICATOR_HEIGHT = 30;

export default function MarketDepthChart({
  depthData,
  filters,
  width = 800,
  height = 500,
  onPriceClick,
  onOrderClick,
  filteredBuyOrders = [],
  filteredSellOrders = [],
  calculatePriceFn,
}: MarketDepthChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [hoveredPrice, setHoveredPrice] = useState<number | null>(null);

  const [maxSpreadPercent, setMaxSpreadPercent, resetMaxSpreadPercent] = useMaxSpreadPercent(
    depthData,
    filters
  );

  const chartData = useDepthChartData({ depthData, maxSpreadPercent });
  const { priceRange, visibleBids, visibleAsks, maxVolume, midPrice } = chartData;

  // Use full container width and height, accounting only for label space
  const chartWidth = width - CHART_PADDING.left - CHART_PADDING.right;
  const chartHeight = height - CHART_PADDING.top - CHART_PADDING.bottom - SPREAD_INDICATOR_HEIGHT;

  const centerX = useMemo(() => {
    const range = priceRange.max - priceRange.min;
    if (range === 0 || !isFinite(range) || chartWidth === 0) {
      return chartWidth / 2;
    }
    return ((midPrice - priceRange.min) / range) * chartWidth;
  }, [midPrice, priceRange, chartWidth]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left - CHART_PADDING.left;
      const y = e.clientY - rect.top - CHART_PADDING.top - SPREAD_INDICATOR_HEIGHT;

      if (x < 0 || x > chartWidth || y < 0 || y > chartHeight) {
        setTooltip(null);
        setHoveredPrice(null);
        return;
      }

      // Guard against division by zero
      const range = priceRange.max - priceRange.min;
      if (range === 0 || !isFinite(range) || chartWidth === 0) {
        setTooltip(null);
        setHoveredPrice(null);
        return;
      }

      const price = priceRange.min + (x / chartWidth) * range;
      const isLeft = x < centerX;

      let closestLevel: {
        price: number;
        quantity: number;
        cumulativeVolume: number;
      } | null = null;
      let side: "bid" | "ask" = "bid";

      if (isLeft) {
        closestLevel = visibleBids.reduce(
          (closest, bid) => {
            if (!closest || Math.abs(bid.price - price) < Math.abs(closest.price - price)) {
              return bid;
            }
            return closest;
          },
          null as (typeof visibleBids)[0] | null
        );
        side = "bid";
      } else {
        closestLevel = visibleAsks.reduce(
          (closest, ask) => {
            if (!closest || Math.abs(ask.price - price) < Math.abs(closest.price - price)) {
              return ask;
            }
            return closest;
          },
          null as (typeof visibleAsks)[0] | null
        );
        side = "ask";
      }

      if (closestLevel) {
        setHoveredPrice(closestLevel.price);
        setTooltip({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          price: closestLevel.price,
          quantity: closestLevel.quantity,
          cumulativeVolume: closestLevel.cumulativeVolume,
          side,
        });
      } else {
        setTooltip(null);
        setHoveredPrice(null);
      }
    },
    [chartWidth, chartHeight, priceRange.min, priceRange.max, visibleBids, visibleAsks, centerX]
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
    setHoveredPrice(null);
  }, []);

  const handleClick = useCallback(() => {
    if (!hoveredPrice) return;

    // Try to find the order by price and call onOrderClick
    if (
      onOrderClick &&
      calculatePriceFn &&
      (filteredBuyOrders.length > 0 || filteredSellOrders.length > 0)
    ) {
      // Determine if we're clicking on a bid or ask based on price comparison
      const price = hoveredPrice;
      const isBid =
        depthData.bestBid && depthData.bestAsk
          ? price <= depthData.bestBid || (price < depthData.bestAsk && price <= depthData.bestBid)
          : depthData.bestBid
            ? price <= depthData.bestBid
            : false;

      const orders = isBid ? filteredBuyOrders : filteredSellOrders;
      const order = findOrderByPrice(price, orders, calculatePriceFn);

      if (order && order.id) {
        onOrderClick(order);
        return;
      }
    }

    // Fallback to onPriceClick if order not found
    onPriceClick?.(hoveredPrice);
  }, [
    hoveredPrice,
    onPriceClick,
    onOrderClick,
    calculatePriceFn,
    filteredBuyOrders,
    filteredSellOrders,
    depthData,
  ]);

  return (
    <div className="relative w-full h-full bg-[#131722] rounded-lg overflow-hidden">
      <SpreadControls
        depthData={depthData}
        maxSpreadPercent={maxSpreadPercent}
        onMaxSpreadChange={setMaxSpreadPercent}
        onReset={resetMaxSpreadPercent}
      />

      <ExcludedOffersIndicator
        excludedBids={depthData.excludedBids}
        excludedAsks={depthData.excludedAsks}
        onOrderClick={onOrderClick}
        filteredBuyOrders={filteredBuyOrders}
        filteredSellOrders={filteredSellOrders}
        calculatePriceFn={calculatePriceFn}
      />

      <DepthChartSVG
        width={width}
        height={height}
        chartWidth={chartWidth}
        chartHeight={chartHeight}
        priceRange={priceRange}
        visibleBids={visibleBids}
        visibleAsks={visibleAsks}
        maxVolume={maxVolume}
        centerX={centerX}
        hoveredPrice={hoveredPrice}
        bestBid={depthData.bestBid}
        bestAsk={depthData.bestAsk}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />

      <DepthChartTooltip tooltip={tooltip} />
    </div>
  );
}
