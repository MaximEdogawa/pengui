"use client";

import { FeatureGate } from "@/shared/ui";
import type { OfferDetails } from "@/entities/offer";
import { OfferDetailsModal, OfferHistory, useMyOffers } from "@/features/offers";
import { SplashConnectionProvider } from "@/features/splash-terminal";
import StreamContainer from "@/features/trading/ui/widgets/stream/StreamContainer";
import OrderBookFilters from "@/features/trading/ui/widgets/orderbook/OrderBookFilters";
import type { OrderBookOrder } from "@/features/trading/lib/orderBookTypes";
import { CreateOfferModal, TakeOfferModal } from "@/features/trading";
import { useThemeClasses } from "@/shared/hooks";
import { useEffect, useState } from "react";
import { OffersPageHeader } from "@/features/offers/ui/components/OfferHistory/OffersPageHeader";
import { CancelOfferConfirmationModal } from "@/features/offers/ui/components/OfferHistory/CancelOfferConfirmationModal";
import Handshake from "lucide-react/dist/esm/icons/handshake";
import Radio from "lucide-react/dist/esm/icons/radio";
import FilterPanel from "@/widgets/trading-layout/ui/FilterPanel";
import { OrderBookFiltersProvider } from "@/features/trading/hooks/OrderBookFiltersProvider";

type OffersView = "my-offers" | "live-stream";

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
  const [selectedStreamOrder, setSelectedStreamOrder] = useState<OrderBookOrder | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeView, setActiveView] = useState<OffersView>("my-offers");

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshOffers();
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

  if (!mounted) {
    return null;
  }

  const views = [
    { id: "my-offers" as const, icon: Handshake, label: "My Offers" },
    { id: "live-stream" as const, icon: Radio, label: "Live Stream" },
  ];

  return (
    <FeatureGate flag="offers">
    <OrderBookFiltersProvider>
      <SplashConnectionProvider>
        <div className="w-full relative z-10 min-h-full flex flex-col">
          <OffersPageHeader
            isDark={isDark}
            t={t}
            onCreateOffer={() => setShowCreateOffer(true)}
            onTakeOffer={() => setShowTakeOffer(true)}
            onRefresh={handleRefresh}
            isLoading={isLoading}
            isRefreshing={isRefreshing}
          />

          {/* View Tabs */}
          <div
            className={`mb-1.5 sm:mb-2 backdrop-blur-[40px] ${t.card} rounded-xl p-0.5 sm:p-1 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 ${
              isDark ? "bg-white/[0.03]" : "bg-white/30"
            }`}
          >
            <div className="flex gap-0.5 sm:gap-1">
              {views.map((view) => {
                const Icon = view.icon;
                const isActive = activeView === view.id;
                return (
                  <button
                    key={view.id}
                    onClick={() => setActiveView(view.id)}
                    className={`flex items-center gap-0.5 sm:gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg transition-all duration-200 font-medium text-[10px] sm:text-[11px] relative overflow-hidden ${
                      isActive
                        ? isDark
                          ? "bg-white/10 text-white backdrop-blur-xl"
                          : "bg-white/50 text-slate-800 backdrop-blur-xl"
                        : `${t.textSecondary} ${t.cardHover}`
                    }`}
                  >
                    {isActive && (
                      <>
                        <div
                          className={`absolute inset-0 backdrop-blur-xl ${
                            isDark ? "bg-white/10" : "bg-white/30"
                          } rounded-lg`}
                        />
                        <div
                          className={`absolute inset-0 bg-gradient-to-b ${
                            isDark ? "from-white/5" : "from-white/20"
                          } to-transparent rounded-lg`}
                        />
                      </>
                    )}
                    <Icon
                      size={11}
                      strokeWidth={2.5}
                      className={`relative sm:w-3 sm:h-3 ${isActive ? "opacity-100" : "opacity-70"}`}
                    />
                    <span className="relative">{view.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div
            className={`flex flex-1 flex-col min-h-0 rounded-2xl ${
              isDark ? "bg-white/[0.03]" : "bg-white/30"
            }`}
          >
            {activeView === "my-offers" ? (
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
            ) : (
              <div className="flex flex-col flex-1 min-h-0 gap-1.5">
                {/* Asset Search & Filters */}
                <div>
                  <OrderBookFilters hidePagination />
                </div>
                {/* Stream Table */}
                <div
                  className={`backdrop-blur-[40px] ${t.card} flex-1 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 overflow-hidden min-h-0 rounded-2xl`}
                >
                  <StreamContainer onOfferClick={(order) => setSelectedStreamOrder(order)} />
                </div>
              </div>
            )}
          </div>

          {/* Create Offer Modal */}
          {showCreateOffer && (
            <CreateOfferModal
              onClose={() => setShowCreateOffer(false)}
              onOfferCreated={handleOfferCreatedWrapper}
            />
          )}

          {/* Take Offer Modal (from header button) */}
          {showTakeOffer && (
            <TakeOfferModal
              onClose={() => setShowTakeOffer(false)}
              onOfferTaken={() => {
                setShowTakeOffer(false);
              }}
            />
          )}

          {/* Take Offer Modal (from stream click) */}
          {selectedStreamOrder && (
            <TakeOfferModal
              order={selectedStreamOrder}
              onClose={() => setSelectedStreamOrder(null)}
              onOfferTaken={() => {
                setSelectedStreamOrder(null);
              }}
            />
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

        {/* Filter Panel */}
        <FilterPanel onFiltersChange={refreshOffers} />
      </SplashConnectionProvider>
    </OrderBookFiltersProvider>
    </FeatureGate>
  );
}
