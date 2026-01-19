'use client'

import OrderBookContainer from '../orderbook/OrderBookContainer'
import { PriceChart } from '../chart'
import MarketDepthView from '../depth/MarketDepthView'
import { useThemeClasses } from '@/shared/hooks'
import type { OrderBookOrder } from '../../lib/orderBookTypes'
import { logger } from '@/shared/lib/logger'

interface TradingContentProps {
  activeView: 'orderbook' | 'chart' | 'depth' | 'trades'
  filters?: {
    buyAsset?: string[]
    sellAsset?: string[]
  }
  onOrderClick: (order: OrderBookOrder) => void
}

export default function TradingContent({ activeView, filters, onOrderClick }: TradingContentProps) {
  const { t } = useThemeClasses()

  if (activeView === 'orderbook') {
    return <OrderBookContainer filters={filters} onOrderClick={onOrderClick} />
  }

  if (activeView === 'chart') {
    return <PriceChart />
  }

  if (activeView === 'depth') {
    return <MarketDepthView filters={filters} onPriceClick={(price) => {
      logger.info('Price clicked:', price)
    }} />
  }

  // Placeholder for trades view
  return (
    <div className={`${t.card} p-4 h-full flex flex-col`}>
      <h3 className={`text-lg font-semibold ${t.text} mb-4`}>
        Market Trades
      </h3>
      <div className={`flex-1 ${t.card} rounded-lg flex items-center justify-center`}>
        <p className={t.textSecondary}>
          Market trades component will be implemented here
        </p>
      </div>
    </div>
  )
}
