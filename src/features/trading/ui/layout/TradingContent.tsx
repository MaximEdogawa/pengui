'use client'

import OrderBookContainer from '../orderbook/OrderBookContainer'
import { useThemeClasses } from '@/shared/hooks'
import type { OrderBookOrder } from '../../lib/orderBookTypes'

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

  // Placeholder for other views
  return (
    <div className={`${t.card} p-4 h-full flex flex-col`}>
      <h3 className={`text-lg font-semibold ${t.text} mb-4`}>
        {activeView === 'chart' && 'Price Chart'}
        {activeView === 'depth' && 'Market Depth'}
        {activeView === 'trades' && 'Market Trades'}
      </h3>
      <div className={`flex-1 ${t.card} rounded-lg flex items-center justify-center`}>
        <p className={t.textSecondary}>
          {activeView === 'chart' && 'Chart component will be implemented here'}
          {activeView === 'depth' && 'Depth chart component will be implemented here'}
          {activeView === 'trades' && 'Market trades component will be implemented here'}
        </p>
      </div>
    </div>
  )
}
