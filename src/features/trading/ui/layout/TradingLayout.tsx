'use client'

import { useThemeClasses } from '@/shared/hooks'
import { useResponsive } from '@/shared/hooks/useResponsive'
import { useCallback, useState } from 'react'
import type { OrderBookOrder } from '../../lib/orderBookTypes'
import { useOrderBookFilters } from '../../model/OrderBookFiltersProvider'
import { useOrderBookOfferSubmission } from '../../model/useOrderBookOfferSubmission'
import CreateOfferModal from '../modals/CreateOfferModal'
import TakeOfferModal from '../modals/TakeOfferModal'
import OrderBookFilters from '../orderbook/OrderBookFilters'
import LimitOfferTab from './OfferTab'
import TradingContent from './TradingContent'
import TradingRightPanel from './TradingRightPanel'

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
      setSelectedOrderForTaking(order)
      setSelectedOrderForMaking(order)

      if (currentMode === 'taker') {
        if (isMobile) {
          setShowTakeOfferModal(true)
        }
      } else {
        if (isMobile) {
          // useAsTemplate is a callback function returned from useOrderBookOfferSubmission hook, not a hook itself
          // eslint-disable-next-line react-hooks/rules-of-hooks
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
      <TradingRightPanel
        currentMode={currentMode}
        selectedOrderForTaking={selectedOrderForTaking}
        selectedOrderForMaking={selectedOrderForMaking}
        onModeChange={handleModeChange}
        onOfferTaken={handleOfferTaken}
        onOfferCreated={handleOfferCreated}
        onOpenCreateModal={() => setShowCreateOfferModal(true)}
        filters={filters}
      />

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
