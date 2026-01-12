'use client'

import { useThemeClasses } from '@/shared/hooks'
import { useResponsive } from '@/shared/hooks/useResponsive'
import { useCallback, useState } from 'react'
import type { OrderBookOrder } from '../../lib/orderBookTypes'
import { useOrderBookFilters } from '../../model/OrderBookFiltersProvider'
import { useOrderBookOfferSubmission } from '../../model/useOrderBookOfferSubmission'
import CreateOfferForm from '../make-offer/CreateOfferForm'
import CreateOfferModal from '../modals/CreateOfferModal'
import TakeOfferModal from '../modals/TakeOfferModal'
import OrderBookFilters from '../orderbook/OrderBookFilters'
import MarketOfferTab from '../take-offer/MarketOfferTab'
import LimitOfferTab from './LimitOfferTab'
import TradingContent from './TradingContent'

interface TradingLayoutProps {
  activeTradingView?: 'orderbook' | 'chart' | 'depth' | 'trades'
  activeMode?: 'maker' | 'taker'
}

export default function TradingLayout({
  activeTradingView = 'orderbook',
  activeMode = 'taker',
}: TradingLayoutProps) {
  const { t } = useThemeClasses()
  const { filters } = useOrderBookFilters()
  const { useAsTemplate, resetForm } = useOrderBookOfferSubmission()
  const { isMobile } = useResponsive()

  const [showCreateOfferModal, setShowCreateOfferModal] = useState(false)
  const [showTakeOfferModal, setShowTakeOfferModal] = useState(false)
  const [selectedOrderForTaking, setSelectedOrderForTaking] = useState<OrderBookOrder | null>(null)
  const [selectedOrderForMaking, setSelectedOrderForMaking] = useState<OrderBookOrder | null>(null)
  const [currentMode, setCurrentMode] = useState<'maker' | 'taker'>(activeMode)

  const handleOrderClick = useCallback(
    (order: OrderBookOrder) => {
      // Set the same order for both maker and taker tabs
      setSelectedOrderForTaking(order)
      setSelectedOrderForMaking(order)

      if (currentMode === 'taker') {
        // Taker mode: show market offer (responsive)
        if (isMobile) {
          // Mobile: always open modal
          setShowTakeOfferModal(true)
        }
        // Desktop: show inline (handled in render)
      } else {
        // Maker mode: show limit offer
        if (isMobile) {
          // Mobile: open CreateOfferModal with order data
          useAsTemplate(order)
          setShowCreateOfferModal(true)
        }
        // Desktop: show inline (handled in render)
      }
    },
    [currentMode, useAsTemplate, isMobile]
  )

  const handleFiltersChange = useCallback(() => {
    // Filters change will trigger useOrderBook to refetch automatically
    // via the query key dependency
  }, [])

  const handleModeChange = useCallback((mode: 'maker' | 'taker') => {
    setCurrentMode(mode)
    // Don't clear selected orders or reset form when switching modes
    // Keep the state of each tab until a new offer is selected
    setShowTakeOfferModal(false)
    setShowCreateOfferModal(false)
  }, [])

  const handleTakeOfferClose = useCallback(() => {
    setShowTakeOfferModal(false)
    setSelectedOrderForTaking(null)
    resetForm()
  }, [resetForm])

  const handleOfferTaken = useCallback(() => {
    setShowTakeOfferModal(false)
    setSelectedOrderForTaking(null)
    resetForm()
    // Order book will auto-refresh via useOrderBook hook
  }, [resetForm])

  const handleOfferCreated = useCallback(() => {
    setShowCreateOfferModal(false)
    // Keep selectedOrderForMaking so it can be used for pre-filling next time
    // Only clear it when mode changes or explicitly needed
    resetForm()
    // Order book will auto-refresh via useOrderBook hook
  }, [resetForm])

  const handleMobileModeToggle = useCallback((mode: 'maker' | 'taker') => {
    setCurrentMode(mode)
    if (mode === 'maker') {
      // Limit: open Create Offer modal
      setShowCreateOfferModal(true)
      setShowTakeOfferModal(false)
    } else {
      // Market: open Take Offer modal
      // Clear selected order so offer string field is shown
      setSelectedOrderForTaking(null)
      setShowTakeOfferModal(true)
      setShowCreateOfferModal(false)
    }
  }, [])

  return (
    <div className="flex h-full">
      {/* Order Book - Full width on mobile/tablet, left panel on desktop (lg+) */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Order Book Filters - Show on all screens */}
        <div className="mb-2">
          <OrderBookFilters onFiltersChange={handleFiltersChange} />
        </div>
        {/* Mobile Toggle - Limit/Market - Only show on mobile */}
        {isMobile && (
          <div className="mb-2">
            <LimitOfferTab
              activeMode={currentMode}
              onModeChange={handleMobileModeToggle}
              selectedOrder={null}
              filters={filters}
            />
          </div>
        )}
        <div className="flex-1 min-h-0">
          <TradingContent
            activeView={activeTradingView}
            filters={filters}
            onOrderClick={handleOrderClick}
          />
        </div>
      </div>

      {/* Resize Handle - Hidden on mobile/tablet, visible on desktop (lg+) */}
      <div
        className={`hidden lg:flex resize-handle m-1 ${t.card} hover:bg-gray-300 dark:hover:bg-gray-500 cursor-col-resize transition-colors items-center justify-center relative`}
        title="Drag to resize panels"
      >
        <div className="w-full flex items-center justify-center">
          <div className="flex items-center gap-1"></div>
        </div>
        {/* Invisible larger hit area */}
        <div className="absolute inset-0 w-6 h-full -left-1"></div>
      </div>

      {/* Right Panel with Trading Form - Hidden on mobile/tablet, visible on desktop (lg+) */}
      <div className="hidden lg:flex flex-col w-96 flex-shrink-0">
        <LimitOfferTab
          activeMode={currentMode}
          onModeChange={handleModeChange}
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
            <div
              className="w-full py-4"
              style={{
                // Match top/bottom padding (1rem) while accounting for scrollbar-gutter on right
                // Scrollbar gutter is typically ~15-17px, using 16px as approximation
                // Visual spacing: left = 1rem, right = 1rem (padding) + scrollbar gutter = 1rem visually
                paddingLeft: '1rem',
                paddingRight: '0.25rem',
              }}
            >
              {selectedOrderForTaking ? (
                <MarketOfferTab
                  key={`taker-${selectedOrderForTaking.id}`}
                  order={selectedOrderForTaking}
                  onOfferTaken={handleOfferTaken}
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
                    onClick={() => setShowCreateOfferModal(true)}
                    className={`w-full px-4 py-2 rounded-lg ${t.card} border ${t.border} ${t.text} ${t.cardHover} transition-colors text-sm font-medium`}
                  >
                    Market
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={`${currentMode === 'maker' ? '' : 'hidden'}`}>
            <div
              className="w-full py-4"
              style={{
                // Match top/bottom padding (1rem) while accounting for scrollbar-gutter on right
                // Scrollbar gutter is typically ~15-17px, using 16px as approximation
                // Visual spacing: left = 1rem, right = 1rem (padding) + scrollbar gutter = 1rem visually
                paddingLeft: '1rem',
                paddingRight: '0.25rem',
              }}
            >
              {selectedOrderForMaking ? (
                <CreateOfferForm
                  key={`maker-${selectedOrderForMaking.id}`}
                  order={selectedOrderForMaking}
                  onOfferCreated={handleOfferCreated}
                  mode="inline"
                  onOpenModal={() => {
                    setShowCreateOfferModal(true)
                  }}
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
                    onClick={() => {
                      // If there was a previously selected order, it will be passed to the modal
                      setShowCreateOfferModal(true)
                    }}
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

      {/* Create Offer Modal */}
      {showCreateOfferModal && (
        <CreateOfferModal
          initialOrder={selectedOrderForMaking || undefined}
          onClose={() => {
            setShowCreateOfferModal(false)
            // Don't clear selectedOrderForMaking here - keep it for pre-filling
            resetForm()
          }}
          onOfferCreated={handleOfferCreated}
          filters={filters}
        />
      )}

      {/* Market Offer Modal - Only shown on mobile */}
      {showTakeOfferModal && (
        <TakeOfferModal
          order={selectedOrderForTaking || undefined}
          onClose={handleTakeOfferClose}
          onOfferTaken={handleOfferTaken}
        />
      )}
    </div>
  )
}
