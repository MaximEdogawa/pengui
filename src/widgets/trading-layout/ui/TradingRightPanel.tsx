'use client'

import { useThemeClasses } from '@/shared/hooks'
import type { OrderBookFilters, OrderBookOrder } from '@/features/trading/lib/orderBookTypes'
import CreateOfferForm from '@/features/trading/ui/limit/CreateOfferForm'
import MarketOfferTab from '@/features/trading/ui/market/MarketOfferContent'
import LimitOfferTab from './OfferTab'

interface TradingRightPanelProps {
  currentMode: 'maker' | 'taker'
  selectedOrderForTaking: OrderBookOrder | null
  selectedOrderForMaking: OrderBookOrder | null
  onModeChange: (mode: 'maker' | 'taker') => void
  onOfferTaken: () => void
  onOfferCreated: () => void
  onOpenCreateModal: () => void
  filters: OrderBookFilters
}

export default function TradingRightPanel({
  currentMode,
  selectedOrderForTaking,
  selectedOrderForMaking,
  onModeChange,
  onOfferTaken,
  onOfferCreated,
  onOpenCreateModal,
  filters,
}: TradingRightPanelProps) {
  const { t } = useThemeClasses()

  return (
    <div className="hidden lg:flex flex-col w-96 flex-shrink-0">
      <LimitOfferTab
        activeMode={currentMode}
        onModeChange={onModeChange}
        selectedOrder={selectedOrderForTaking}
        filters={filters}
      />
      <div
        className={`${t.card} rounded-lg border ${t.border} flex-1 overflow-y-auto`}
        style={{ scrollbarGutter: 'stable' }}
      >
        {/* Show inline content on desktop when order is selected */}
        {/* Keep both components mounted to preserve state when switching tabs */}
        <div className={`${currentMode === 'taker' ? '' : 'hidden'}`}>
          <div className="w-full p-4">
            {selectedOrderForTaking ? (
              <MarketOfferTab
                key={`taker-${selectedOrderForTaking.id}`}
                order={selectedOrderForTaking}
                onOfferTaken={onOfferTaken}
                mode="inline"
                filters={filters}
              />
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className={`text-sm font-semibold ${t.text} mb-2`}>Market</h3>
                  <p className={`text-xs ${t.textSecondary} mb-4`}>
                    Click an offer from the order book to take it, or create a new offer manually.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onOpenCreateModal}
                  className={`w-full px-4 py-2 rounded-lg ${t.card} border ${t.border} ${t.text} ${t.cardHover} transition-colors text-sm font-medium`}
                >
                  Market
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={`${currentMode === 'maker' ? '' : 'hidden'}`}>
          <div className="w-full p-4">
            {selectedOrderForMaking ? (
              <CreateOfferForm
                key={`maker-${selectedOrderForMaking.id}`}
                order={selectedOrderForMaking}
                onOfferCreated={onOfferCreated}
                mode="inline"
                onOpenModal={onOpenCreateModal}
                filters={filters}
              />
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className={`text-sm font-semibold ${t.text} mb-2`}>Create Offer</h3>
                  <p className={`text-xs ${t.textSecondary} mb-4`}>
                    Create a new trading offer. Click an offer from the order book to use it as a
                    template.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onOpenCreateModal}
                  className={`w-full px-4 py-2 rounded-lg ${t.card} border ${t.border} ${t.text} ${t.cardHover} transition-colors text-sm font-medium`}
                >
                  Create New Offer
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
