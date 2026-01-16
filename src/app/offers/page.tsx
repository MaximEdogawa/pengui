'use client'

import type { OfferDetails } from '@/entities/offer'
import { OfferDetailsModal, OfferHistory, useMyOffers } from '@/features/offers'
import { CreateOfferModal, TakeOfferModal } from '@/features/trading'
import { OrderBookFiltersProvider } from '@/features/trading/model/OrderBookFiltersProvider'
import { useThemeClasses } from '@/shared/hooks'
import { useEffect, useState } from 'react'
import { OffersPageHeader } from './components/OffersPageHeader'
import { CancelOfferConfirmationModal } from './components/CancelOfferConfirmationModal'

export default function OffersPage() {
  const { isDark, t } = useThemeClasses()
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
  } = useMyOffers()

  const [showCreateOffer, setShowCreateOffer] = useState(false)
  const [showTakeOffer, setShowTakeOffer] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Don't call refreshOffers here - OfferHistory handles it on mount
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshOffers()
      // Add a small delay to show the refresh animation
      await new Promise((resolve) => setTimeout(resolve, 500))
    } catch {
      // Error handled by refreshOffers
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleOfferCreatedWrapper = async (offer: OfferDetails) => {
    await handleOfferCreated(offer)
    setShowCreateOffer(false)
  }

  const handleViewOffer = (offer: OfferDetails) => {
    viewOffer(offer)
  }

  if (!mounted) {
    return null
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
        className={`backdrop-blur-[40px] ${t.card} rounded-2xl p-4 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 ${
          isDark ? 'bg-white/[0.03]' : 'bg-white/30'
        }`}
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

      {/* Create Offer Modal */}
      {showCreateOffer && (
        <CreateOfferModal
          onClose={() => setShowCreateOffer(false)}
          onOfferCreated={handleOfferCreatedWrapper}
        />
      )}

      {/* Take Offer Modal */}
      {showTakeOffer && (
        <OrderBookFiltersProvider>
          <TakeOfferModal
            onClose={() => setShowTakeOffer(false)}
            onOfferTaken={() => {
              // Offer was taken successfully, modal will close automatically
              setShowTakeOffer(false)
            }}
          />
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
  )
}
