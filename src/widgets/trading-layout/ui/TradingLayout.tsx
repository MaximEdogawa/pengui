"use client";

import { useThemeClasses } from "@/shared/hooks";
import { useResponsive } from "@/shared/hooks/useResponsive";
import { useCallback, useState } from "react";
import type { OrderBookOrder } from "@/features/trading/lib/orderBookTypes";
import { useOrderBookFilters } from "@/features/trading/hooks/OrderBookFiltersProvider";
import { useSelectedOrder } from "@/features/trading/hooks/SelectedOrderProvider";
import CreateOfferModal from "@/features/trading/ui/componets/offer/CreateOfferDialog";
import TakeOfferModal from "@/features/trading/ui/componets/offer/TakeOfferDialog";
import OrderBookFilters from "@/features/trading/ui/widgets/orderbook/OrderBookFilters";
import LimitOfferTab from "./OfferTab";
import TradingContent from "./TradingContent";
import TradingRightPanel from "./TradingRightPanel";
import { SwapTabContent } from "@/features/tibet-swap/ui/SwapTabContent";
import { isFeatureEnabled } from "@/shared/config/featureFlags";
import type { OrderBookPanelMode } from "./types";

export type { OrderBookPanelMode } from "./types";

interface TradingLayoutProps {
  activeTradingView?: "orderbook" | "chart" | "depth" | "trades" | "terminal";
  activeMode?: OrderBookPanelMode;
}

export default function TradingLayout({
  activeTradingView = "orderbook",
  activeMode = "taker",
}: TradingLayoutProps) {
  const { t } = useThemeClasses();
  const { filters } = useOrderBookFilters();
  const {
    selectedOrderForTaking,
    selectedOrderForMaking,
    selectOrderForTaking,
    selectOrderForMaking,
    clearSelectedOrders,
    resetForm,
    // Rename at the call site: this is a plain callback, not a React hook.
    // The `use` prefix in the provider name was confusing eslint.
    useAsTemplate: applyAsTemplate,
  } = useSelectedOrder();
  const { isMobile } = useResponsive();

  const [showCreateOfferModal, setShowCreateOfferModal] = useState(false);
  const [showTakeOfferModal, setShowTakeOfferModal] = useState(false);
  const [currentMode, setCurrentMode] = useState<OrderBookPanelMode>(activeMode);

  const handleOrderClick = useCallback(
    async (order: OrderBookOrder) => {
      // Select order for taking (fills market tab)
      await selectOrderForTaking(order);

      // Also select for making (fills limit tab)
      selectOrderForMaking(order);

      if (currentMode === "taker") {
        if (isMobile) {
          setShowTakeOfferModal(true);
        }
      } else {
        if (isMobile) {
          applyAsTemplate(order);
          setShowCreateOfferModal(true);
        }
        // Desktop: show inline (handled in render)
      }
    },
    [currentMode, applyAsTemplate, isMobile, selectOrderForTaking, selectOrderForMaking]
  );

  const handleFiltersChange = useCallback(() => {
    // Filters change will trigger useOrderBook to refetch automatically
    // via the query key dependency
  }, []);

  const handleModeChange = useCallback((mode: OrderBookPanelMode) => {
    setCurrentMode(mode);
    setShowTakeOfferModal(false);
    setShowCreateOfferModal(false);
  }, []);

  const handleTakeOfferClose = useCallback(() => {
    setShowTakeOfferModal(false);
    clearSelectedOrders();
  }, [clearSelectedOrders]);

  const handleOfferTaken = useCallback(() => {
    setShowTakeOfferModal(false);
    clearSelectedOrders();
    // Order book will auto-refresh via useOrderBook hook
  }, [clearSelectedOrders]);

  const handleOfferCreated = useCallback(() => {
    setShowCreateOfferModal(false);
    // Keep selectedOrderForMaking so it can be used for pre-filling next time
    // Only clear it when mode changes or explicitly needed
    resetForm();
    // Order book will auto-refresh via useOrderBook hook
  }, [resetForm]);

  const handleMobileModeToggle = useCallback((mode: OrderBookPanelMode) => {
    setCurrentMode(mode);
    setShowCreateOfferModal(false);
    setShowTakeOfferModal(false);
  }, []);

  return (
    <div className="flex h-full">
      {/* Left: Filters + main content (Order Book / Chart / Depth / Trades / Stream) */}
      <div className="flex flex-col flex-1 min-w-0">
        <div className="mb-2">
          <OrderBookFilters onFiltersChange={handleFiltersChange} />
        </div>
        {/* Limit / Market / Swap tabs - shown for all main views (Order book, Chart, Depth, Trades, Stream) */}
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
          {isMobile && currentMode === "swap" && isFeatureEnabled("swap") ? (
            <div
              className={`h-full overflow-y-auto ${t.card} rounded-lg border ${t.border} px-1.5 py-1`}
              style={{ scrollbarGutter: "stable" }}
            >
              <SwapTabContent mode="inline" />
            </div>
          ) : (
            <TradingContent
              activeView={activeTradingView}
              filters={filters}
              onOrderClick={handleOrderClick}
            />
          )}
        </div>
      </div>

      {/* Resize Handle - shown on desktop for all views */}
      <div
        className={`hidden lg:flex resize-handle m-1 ${t.card} hover:bg-gray-300 dark:hover:bg-gray-500 cursor-col-resize transition-colors items-center justify-center relative`}
        title="Drag to resize panels"
      >
        <div className="w-full flex items-center justify-center">
          <div className="flex items-center gap-1"></div>
        </div>
        <div className="absolute inset-0 w-6 h-full -left-1"></div>
      </div>

      {/* Right Panel - Limit / Market / Swap - shown for all main views */}
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
            setShowCreateOfferModal(false);
            // Don't clear selectedOrderForMaking here - keep it for pre-filling
            resetForm();
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
  );
}
