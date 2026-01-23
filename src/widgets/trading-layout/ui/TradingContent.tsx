'use client'

import OrderBookContainer from '@/features/trading/ui/orderbook/OrderBookContainer'
import { PriceChart } from '@/features/trading/ui/chart'
import MarketDepthView from '@/features/trading/ui/depth/MarketDepthView'
import { TradeHistoryContainer } from '@/features/trading/ui/trade-history'
import type { OrderBookOrder } from '@/features/trading/lib/orderBookTypes'

interface TradingContentProps {
  activeView: 'orderbook' | 'chart' | 'depth' | 'trades'
  filters?: {
    buyAsset?: string[]
    sellAsset?: string[]
  }
  onOrderClick: (order: OrderBookOrder) => void
}

export default function TradingContent({ activeView, filters, onOrderClick }: TradingContentProps) {

  if (activeView === 'orderbook') {
    return <OrderBookContainer filters={filters} onOrderClick={onOrderClick} />
  }

  if (activeView === 'chart') {
    return <PriceChart />
  }

  if (activeView === 'depth') {
    return <MarketDepthView filters={filters} onOrderClick={onOrderClick} />
  }

  if (activeView === 'trades') {
    return <TradeHistoryContainer />
  }

  return null
}
