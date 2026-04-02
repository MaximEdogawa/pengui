"use client";

import type { OfferDetails } from "@/entities/offer";
import { OfferDetailsModal, OfferHistory, useMyOffers } from "@/features/offers";
import { SplashTerminal, SplashConnectionProvider } from "@/features/splash-terminal";
import { CreateOfferModal, TakeOfferModal } from "@/features/trading";
import { OrderBookFiltersProvider } from "@/features/trading/hooks/OrderBookFiltersProvider";
import { useThemeClasses } from "@/shared/hooks";
import { useEffect, useState } from "react";
import { OffersPageHeader } from "@/features/offers/ui/components/OfferHistory/OffersPageHeader";
import { CancelOfferConfirmationModal } from "@/features/offers/ui/components/OfferHistory/CancelOfferConfirmationModal";

export default function OffersPage() {
  const { isDark, t } = useThemeClasses();
  const {
    selectedOffer,
    isLoading,
    refreshOffers,
    viewOffer,
    handleOfferCreated,
    handleOfferCancelled,
    handleOfferDeleted,
    handleOfferUpdated,
    showCancelConfirmation,
    offerToCancel,
    confirmCancelOffer,
    handleCancelDialogClose,
    isCancelling,
    cancelError,
    cancelOffer,
    filteredOffers,
    filters,
    setFilters,
    getStatusClass,
    formatDate,
    copyOfferString,
    getTickerSymbol,
    isCopied,
    currentPage,
    pageSize,
    totalOffers,
    totalPages,
    goToPage,
    changePageSize,
  } = useMyOffers();

  const [showCreateOffer, setShowCreateOffer] = useState(false);
  const [showTakeOffer, setShowTakeOffer] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(0);
  const [isDraggingTerminal, setIsDraggingTerminal] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Don't call refreshOffers here - OfferHistory handles it on mount
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshOffers();
      // Add a small delay to show the refresh animation
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch {
      // Error handled by refreshOffers
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleOfferCreatedWrapper = async (offer: OfferDetails) => {
    await handleOfferCreated(offer);
    setShowCreateOffer(false);
  };

  const handleViewOffer = (offer: OfferDetails) => {
    viewOffer(offer);
  };

  const toggleTerminal = () => {
    setTerminalHeight((h) => (h > 0 ? 0 : 250));
  };

  useEffect(() => {
    if (!isDraggingTerminal) return;
    const onMove = (ev: MouseEvent) => {
      const y = window.innerHeight - ev.clientY;
      if (y >= 150 && y <= 600) setTerminalHeight(y);
    };
    const onUp = () => setIsDraggingTerminal(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDraggingTerminal]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="w-full relative z-10 min-h-full">
      <OffersPageHeader
        isDark={isDark}
        t={t}
        onCreateOffer={() => setShowCreateOffer(true)}
        onTakeOffer={() => setShowTakeOffer(true)}
        onRefresh={handleRefresh}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
      />

      {/* Offers Content */}
      <div
        className={`flex flex-1 flex-col min-h-0 rounded-2xl ${
          isDark ? "bg-white/[0.03]" : "bg-white/30"
        }`}
      >
        <div
          className={`backdrop-blur-[40px] ${t.card} flex-1 p-4 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 overflow-auto min-h-0`}
        >
          <OfferHistory
            onCreateOffer={() => setShowCreateOffer(true)}
            onViewOffer={handleViewOffer}
            onCancelOffer={cancelOffer}
            offers={filteredOffers}
            isLoading={isLoading}
            filters={filters}
            setFilters={setFilters}
            getStatusClass={getStatusClass}
            formatDate={formatDate}
            copyOfferString={copyOfferString}
            getTickerSymbol={getTickerSymbol}
            isCopied={isCopied}
            refreshOffers={refreshOffers}
            currentPage={currentPage}
            pageSize={pageSize}
            totalOffers={totalOffers}
            totalPages={totalPages}
            goToPage={goToPage}
            changePageSize={changePageSize}
          />
        </div>

        {/* Resizable Splash Terminal pane */}
        <div className="mt-2 flex flex-col rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            type="button"
            onClick={toggleTerminal}
            className={`flex items-center justify-center gap-1 py-1 text-xs font-medium ${t.card} border-b ${t.border} hover:opacity-90`}
          >
            {terminalHeight > 0 ? "Hide" : "Show"} live stream terminal
          </button>
          {terminalHeight > 0 && (
            <>
              <div
                role="separator"
                aria-label="Resize terminal"
                className="h-1 cursor-n-resize bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
                onMouseDown={() => setIsDraggingTerminal(true)}
              />
              <div className="flex min-h-0 flex-col" style={{ height: terminalHeight }}>
                <SplashTerminal />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Offer Modal */}
      {showCreateOffer && (
        <OrderBookFiltersProvider>
          <SplashConnectionProvider>
            <CreateOfferModal
              onClose={() => setShowCreateOffer(false)}
              onOfferCreated={handleOfferCreatedWrapper}
            />
          </SplashConnectionProvider>
        </OrderBookFiltersProvider>
      )}

      {/* Take Offer Modal */}
      {showTakeOffer && (
        <OrderBookFiltersProvider>
          <SplashConnectionProvider>
            <TakeOfferModal
              onClose={() => setShowTakeOffer(false)}
              onOfferTaken={() => {
                // Offer was taken successfully, modal will close automatically
                setShowTakeOffer(false);
              }}
            />
          </SplashConnectionProvider>
        </OrderBookFiltersProvider>
      )}

      {/* Offer Details Modal */}
      {selectedOffer && (
        <OfferDetailsModal
          offer={selectedOffer}
          onClose={() => viewOffer(null)}
          onOfferCancelled={handleOfferCancelled}
          onOfferDeleted={handleOfferDeleted}
          onOfferUpdated={handleOfferUpdated}
        />
      )}

      {/* Cancel Offer Confirmation Modal */}
      {showCancelConfirmation && offerToCancel && (
        <CancelOfferConfirmationModal
          offer={offerToCancel}
          isDark={isDark}
          t={t}
          onConfirm={confirmCancelOffer}
          onClose={handleCancelDialogClose}
          isCancelling={isCancelling}
          cancelError={cancelError}
        />
      )}
    </div>
  );
}
