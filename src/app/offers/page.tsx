'use client'

import type { OfferDetails } from '@/entities/offer'
import { OfferDetailsModal, OfferHistory, useMyOffers } from '@/features/offers'
import { CreateOfferModal, TakeOfferModal } from '@/features/trading'
import { OrderBookFiltersProvider } from '@/features/trading/model/OrderBookFiltersProvider'
import { useThemeClasses } from '@/shared/hooks'
import Button from '@/shared/ui/Button'
import Modal from '@/shared/ui/Modal'
import { Handshake, Loader2, Plus, RefreshCw, ShoppingCart, X } from 'lucide-react'
import { useEffect, useState } from 'react'

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
      {/* Header */}
      <div
        className={`mb-2 backdrop-blur-[40px] ${t.card} rounded-2xl p-3 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 ${
          isDark ? 'bg-white/[0.03]' : 'bg-white/30'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${isDark ? 'bg-cyan-500/10' : 'bg-cyan-600/15'} backdrop-blur-sm`}
            >
              <Handshake
                className={`${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}
                size={18}
                strokeWidth={2}
              />
            </div>
            <div>
              <h1 className={`text-xl lg:text-2xl font-semibold ${t.text} mb-0.5`}>Offers</h1>
              <p className={`${t.textSecondary} text-xs font-medium`}>
                Create, manage, and take offers
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowCreateOffer(true)}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg backdrop-blur-xl ${
                isDark
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 text-cyan-400 hover:from-cyan-500/30 hover:to-blue-500/30'
                  : 'bg-gradient-to-r from-cyan-600/30 to-blue-600/30 border border-cyan-600/40 text-cyan-700 hover:from-cyan-600/40 hover:to-blue-600/40'
              } transition-all duration-200 font-medium text-xs`}
            >
              <Plus size={14} strokeWidth={2.5} />
              Create Offer
            </button>
            <button
              onClick={() => setShowTakeOffer(true)}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg backdrop-blur-xl ${
                isDark
                  ? 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                  : 'bg-white/40 border border-white/60 text-slate-800 hover:bg-white/50'
              } transition-all duration-200 font-medium text-xs`}
            >
              <ShoppingCart size={14} strokeWidth={2.5} />
              Take Offer
            </button>
            <button
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg backdrop-blur-xl ${
                isDark
                  ? 'bg-white/5 border border-white/10 text-white hover:bg-white/10 disabled:opacity-50'
                  : 'bg-white/40 border border-white/60 text-slate-800 hover:bg-white/50 disabled:opacity-50'
              } transition-all duration-200 font-medium text-xs`}
            >
              <RefreshCw
                size={14}
                strokeWidth={2.5}
                className={isLoading || isRefreshing ? 'animate-spin' : ''}
              />
              Refresh
            </button>
          </div>
        </div>
      </div>

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
        <Modal onClose={handleCancelDialogClose} maxWidth="max-w-md" closeOnOverlayClick={false}>
          <div className="p-6">
            <h3 className={`text-lg font-semibold ${t.text} mb-2`}>Cancel Offer</h3>
            <p className={`${t.textSecondary} mb-4`}>
              Are you sure you want to cancel this offer? This action cannot be undone.
            </p>
            <p className={`text-xs ${t.textSecondary} mb-4 font-mono break-all`}>
              Offer ID:{' '}
              {offerToCancel.tradeId
                ? `${offerToCancel.tradeId.slice(0, 12)}...${offerToCancel.tradeId.slice(-8)}`
                : 'Unknown'}
            </p>
            {cancelError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-700 dark:text-red-300">{cancelError}</p>
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button onClick={handleCancelDialogClose} variant="secondary">
                Keep Offer
              </Button>
              <Button
                onClick={confirmCancelOffer}
                disabled={isCancelling}
                variant="danger"
                icon={isCancelling ? undefined : X}
              >
                {isCancelling ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Cancel Offer'
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
