'use client'

import EmptyState from '@/features/wallet/ui/shared/EmptyState'
import { useDexieOfferPolling } from '../model'
import { useThemeClasses } from '@/shared/hooks'
import { Handshake } from 'lucide-react'
import type { OfferDetails } from '@/entities/offer'
import { useOfferHistoryState } from './OfferHistory/hooks/useOfferHistoryState'
import { OfferHistoryHeader } from './OfferHistory/components/OfferHistoryHeader'
import { OfferHistoryTable } from './OfferHistory/components/OfferHistoryTable'
import { OfferHistoryCards } from './OfferHistory/components/OfferHistoryCards'
import { OfferHistoryPagination } from './OfferHistory/components/OfferHistoryPagination'
import { CancelAllConfirmation } from './OfferHistory/components/CancelAllConfirmation'
import { DeleteAllConfirmation } from './OfferHistory/components/DeleteAllConfirmation'

interface OfferHistoryProps {
  onCreateOffer: () => void
  onViewOffer: (offer: OfferDetails) => void
  onCancelOffer?: (offer: OfferDetails) => void
  // Optional props to share state from parent
  offers?: OfferDetails[]
  isLoading?: boolean
  filters?: { status?: string }
  setFilters?: (filters: { status?: string }) => void
  getStatusClass?: (status: string) => string
  formatDate?: (date: Date) => string
  copyOfferString?: (offerString: string) => Promise<void>
  getTickerSymbol?: (assetId: string) => string
  isCopied?: string | null
  refreshOffers?: () => Promise<void>
  // Pagination props
  currentPage?: number
  pageSize?: number
  totalOffers?: number
  totalPages?: number
  goToPage?: (page: number) => void
  changePageSize?: (pageSize: number) => void
}

export default function OfferHistory({
  onCreateOffer,
  onViewOffer,
  onCancelOffer,
  offers: parentOffers,
  isLoading: parentIsLoading,
  filters: parentFilters,
  setFilters: parentSetFilters,
  getStatusClass: parentGetStatusClass,
  formatDate: parentFormatDate,
  copyOfferString: parentCopyOfferString,
  getTickerSymbol: parentGetTickerSymbol,
  isCopied: parentIsCopied,
  refreshOffers: parentRefreshOffers,
  currentPage: parentCurrentPage,
  pageSize: parentPageSize,
  totalOffers: parentTotalOffers,
  totalPages: parentTotalPages,
  goToPage: parentGoToPage,
  changePageSize: parentChangePageSize,
}: OfferHistoryProps) {
  const { isDark, t } = useThemeClasses()

  const state = useOfferHistoryState({
    offers: parentOffers,
    isLoading: parentIsLoading,
    filters: parentFilters,
    setFilters: parentSetFilters,
    getStatusClass: parentGetStatusClass,
    formatDate: parentFormatDate,
    copyOfferString: parentCopyOfferString,
    getTickerSymbol: parentGetTickerSymbol,
    isCopied: parentIsCopied,
    refreshOffers: parentRefreshOffers,
    currentPage: parentCurrentPage,
    pageSize: parentPageSize,
    totalOffers: parentTotalOffers,
    totalPages: parentTotalPages,
    goToPage: parentGoToPage,
    changePageSize: parentChangePageSize,
  })

  useDexieOfferPolling(state.filteredOffers)

  const handleViewOffer = (offer: OfferDetails) => {
    onViewOffer(offer)
  }

  const handleFilterChange = (status: string | undefined) => {
    state.setFilters({ ...state.filters, status })
  }

  const cancelOffer = onCancelOffer || (() => {})

  return (
    <div className={`${t.card} p-4 sm:p-6 pb-8`}>
      <OfferHistoryHeader
        filters={state.filters}
        pageSize={state.pageSize}
        isLoading={state.isLoading}
        hasOffers={state.filteredOffers.length > 0}
        onFilterChange={handleFilterChange}
        onPageSizeChange={state.changePageSize}
        onCancelAll={state.cancelAllOffers}
        onDeleteAll={state.deleteAllOffers}
        isDark={isDark}
        t={t}
      />

      {state.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : state.filteredOffers.length > 0 ? (
        <>
          <OfferHistoryTable
            offers={state.filteredOffers}
            getStatusClass={state.getStatusClass}
            formatDate={state.formatDate}
            getTickerSymbol={state.getTickerSymbol}
            isCopied={state.isCopied}
            onCopyOfferString={state.copyOfferString}
            onViewOffer={handleViewOffer}
            onCancelOffer={cancelOffer}
            t={t}
          />
          <OfferHistoryCards
            offers={state.filteredOffers}
            getStatusClass={state.getStatusClass}
            formatDate={state.formatDate}
            getTickerSymbol={state.getTickerSymbol}
            isCopied={state.isCopied}
            onCopyOfferString={state.copyOfferString}
            onViewOffer={handleViewOffer}
            onCancelOffer={cancelOffer}
            t={t}
          />
        </>
      ) : (
        <EmptyState
          icon={Handshake}
          message="No offers found. Create your first offer to start trading."
        />
      )}

      {state.filteredOffers.length > 0 && (
        <OfferHistoryPagination
          currentPage={state.currentPage}
          totalPages={state.totalPages}
          totalOffers={state.totalOffers}
          pageSize={state.pageSize}
          onPageChange={state.goToPage}
          t={t}
        />
      )}

      <CancelAllConfirmation
        isOpen={state.showCancelAllConfirmation}
        isCancelling={state.isCancellingAll}
        error={state.cancelAllError}
        onConfirm={state.confirmCancelAllOffers}
        onClose={state.handleCancelAllDialogClose}
        t={t}
      />

      <DeleteAllConfirmation
        isOpen={state.showDeleteAllConfirmation}
        isDeleting={state.isDeletingAll}
        error={state.deleteAllError}
        onConfirm={state.confirmDeleteAllOffers}
        onClose={state.handleDeleteAllDialogClose}
        t={t}
      />
    </div>
  )
}
