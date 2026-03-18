"use client";

import OrderBookContainer from "@/features/trading/ui/widgets/orderbook/OrderBookContainer";
import { TradeHistoryContainer } from "@/features/trading/ui/widgets/trade-history";
import StreamContainer from "@/features/trading/ui/widgets/stream/StreamContainer";
import type { OrderBookOrder } from "@/features/trading/lib/orderBookTypes";
import PriceChart from "@/features/trading/ui/widgets/chart/PriceChart";
import { MarketDepthView } from "@/features/trading/ui/componets/depth";
import { useTradeHistory } from "@/features/trading/hooks/useTradeHistory";
import { useTradeHistoryFilters } from "@/features/trading/hooks/useTradeHistoryFilters";

interface TradingContentProps {
  activeView: "orderbook" | "chart" | "depth" | "trades" | "terminal";
  filters?: {
    buyAsset?: string[];
    sellAsset?: string[];
  };
  onOrderClick: (order: OrderBookOrder) => void;
}

export default function TradingContent({
  activeView,
  filters,
  onOrderClick,
}: TradingContentProps) {
  const { filters: thFilters } = useTradeHistoryFilters();
  const tradeHistoryResult = useTradeHistory({
    orderBookFilters: filters,
    tradeHistoryFilters: thFilters,
    enabled: activeView === "trades",
  });

  if (activeView === "orderbook") {
    return <OrderBookContainer filters={filters} onOrderClick={onOrderClick} />;
  }

  if (activeView === "chart") {
    return <PriceChart />;
  }

  if (activeView === "depth") {
    return <MarketDepthView filters={filters} onOrderClick={onOrderClick} />;
  }

  if (activeView === "trades") {
    return (
      <TradeHistoryContainer
        tradeHistoryResult={tradeHistoryResult}
        onOfferClick={onOrderClick}
      />
    );
  }

  if (activeView === "terminal") {
    return (
      <div className="h-full min-h-0">
        <StreamContainer onOfferClick={onOrderClick} />
      </div>
    );
  }

  return null;
}
