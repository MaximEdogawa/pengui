'use client'

import Modal from '@/shared/ui/Modal'
import EmptyState from '@/features/wallet/ui/shared/EmptyState'
import { useDexieOfferPolling, useMyOffers } from '../model'
import { useThemeClasses } from '@/shared/hooks'
import { formatAssetAmount } from '@/shared/lib/utils/chia-units'
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  Eye,
  Handshake,
  Loader2,
  Trash2,
  X as XIcon,
} from 'lucide-react'
import { useEffect } from 'react'

import type { OfferDetails } from '@/entities/offer'

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

  // Use parent state if provided, otherwise use hook
  const hookData = useMyOffers()
  const {
    isLoading: hookIsLoading,
    filteredOffers: hookFilteredOffers,
    filters: hookFilters,
    setFilters: hookSetFilters,
    refreshOffers: hookRefreshOffers,
    viewOffer,
    cancelOffer: defaultCancelOffer,
    getStatusClass: hookGetStatusClass,
    formatDate: hookFormatDate,
    copyOfferString: hookCopyOfferString,
    getTickerSymbol: hookGetTickerSymbol,
    isCopied: hookIsCopied,
    currentPage: hookCurrentPage,
    pageSize: hookPageSize,
    totalOffers: hookTotalOffers,
    totalPages: hookTotalPages,
    goToPage: hookGoToPage,
    changePageSize: hookChangePageSize,
    showCancelAllConfirmation,
    isCancellingAll,
    cancelAllError,
    showDeleteAllConfirmation,
    isDeletingAll,
    deleteAllError,
    cancelAllOffers,
    confirmCancelAllOffers,
    handleCancelAllDialogClose,
    deleteAllOffers,
    confirmDeleteAllOffers,
    handleDeleteAllDialogClose,
  } = hookData

  // Use parent props if provided, otherwise use hook values
  const isLoading = parentIsLoading ?? hookIsLoading
  // If parent provides offers, use them directly (they're already filtered by parent)
  // Otherwise use the hook's filtered offers
  const filteredOffers = parentOffers ?? hookFilteredOffers
  const filters = parentFilters ?? hookFilters
  const setFilters = parentSetFilters ?? hookSetFilters
  const getStatusClass = parentGetStatusClass ?? hookGetStatusClass
  const formatDate = parentFormatDate ?? hookFormatDate
  const copyOfferString = parentCopyOfferString ?? hookCopyOfferString
  const getTickerSymbol = parentGetTickerSymbol ?? hookGetTickerSymbol
  const isCopied = parentIsCopied ?? hookIsCopied
  const refreshOffers = parentRefreshOffers ?? hookRefreshOffers
  const currentPage = parentCurrentPage ?? hookCurrentPage
  const pageSize = parentPageSize ?? hookPageSize
  const totalOffers = parentTotalOffers ?? hookTotalOffers
  const totalPages = parentTotalPages ?? hookTotalPages
  const goToPage = parentGoToPage ?? hookGoToPage
  const changePageSize = parentChangePageSize ?? hookChangePageSize

  // Use the passed cancel handler if provided, otherwise use the default from hook
  const cancelOffer = onCancelOffer || defaultCancelOffer

  // Poll Dexie offer status for offers on current page
  useDexieOfferPolling(filteredOffers)

  // Load offers on mount only if using hook (not parent state)
  useEffect(() => {
    if (!parentOffers && refreshOffers) {
      refreshOffers()
    }
  }, [parentOffers, refreshOffers])

  const handleViewOffer = (offer: OfferDetails) => {
    viewOffer(offer)
    onViewOffer(offer)
  }

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxPagesToShow = 5

    if (totalPages <= maxPagesToShow) {
      // Show all pages if total is less than max
      pages.push(...Array.from({ length: totalPages }, (_, i) => i + 1))
    } else {
      // Show first page
      pages.push(1)

      // Calculate start and end
      let start = Math.max(2, currentPage - 1)
      let end = Math.min(totalPages - 1, currentPage + 1)

      // Adjust if we're near the start
      if (currentPage <= 3) {
        end = Math.min(4, totalPages - 1)
      }

      // Adjust if we're near the end
      if (currentPage >= totalPages - 2) {
        start = Math.max(2, totalPages - 3)
      }

      // Add ellipsis if needed
      if (start > 2) {
        pages.push('...')
      }

      // Add page numbers
      pages.push(...Array.from({ length: end - start + 1 }, (_, i) => start + i))

      // Add ellipsis if needed
      if (end < totalPages - 1) {
        pages.push('...')
      }

      // Show last page
      if (totalPages > 1) {
        pages.push(totalPages)
      }
    }

    return pages
  }

  return (
    <div className={`${t.card} p-4 sm:p-6 pb-8`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
        <h2 className={`text-lg sm:text-xl font-semibold ${t.text}`}>My Offers</h2>
        <div className="flex items-center space-x-2 flex-wrap gap-2">
          <select
            value={filters.status || ''}
            onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
            className={`px-3 py-1.5 rounded-lg backdrop-blur-xl font-medium text-xs transition-all duration-200 ${
              isDark
                ? 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                : 'bg-white/40 border border-white/60 text-slate-800 hover:bg-white/50'
            }`}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
          </select>
          <select
            value={pageSize}
            onChange={(e) => changePageSize(Number(e.target.value))}
            className={`px-3 py-1.5 rounded-lg backdrop-blur-xl font-medium text-xs transition-all duration-200 ${
              isDark
                ? 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                : 'bg-white/40 border border-white/60 text-slate-800 hover:bg-white/50'
            }`}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <button
            onClick={cancelAllOffers}
            disabled={isLoading || filteredOffers.length === 0}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg backdrop-blur-xl transition-all duration-200 font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed ${
              isDark
                ? 'bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30 disabled:hover:bg-red-600/20'
                : 'bg-red-600/30 border border-red-600/40 text-red-700 hover:bg-red-600/40 disabled:hover:bg-red-600/30'
            }`}
            title="Cancel all active offers"
          >
            <Ban size={14} strokeWidth={2.5} />
            Cancel All
          </button>
          <button
            onClick={deleteAllOffers}
            disabled={isLoading || filteredOffers.length === 0}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg backdrop-blur-xl transition-all duration-200 font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed ${
              isDark
                ? 'bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30 disabled:hover:bg-red-600/20'
                : 'bg-red-600/30 border border-red-600/40 text-red-700 hover:bg-red-600/40 disabled:hover:bg-red-600/30'
            }`}
            title="Delete all offers"
          >
            <Trash2 size={14} strokeWidth={2.5} />
            Delete All
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : filteredOffers.length > 0 ? (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b border-gray-200 dark:border-gray-700`}>
                  <th className={`text-left py-3 px-4 text-sm font-medium ${t.textSecondary}`}>
                    Offer String
                  </th>
                  <th className={`text-left py-3 px-4 text-sm font-medium ${t.textSecondary}`}>
                    Status
                  </th>
                  <th className={`text-left py-3 px-4 text-sm font-medium ${t.textSecondary}`}>
                    Assets
                  </th>
                  <th className={`text-left py-3 px-4 text-sm font-medium ${t.textSecondary}`}>
                    Created
                  </th>
                  <th className={`text-left py-3 px-4 text-sm font-medium ${t.textSecondary}`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOffers.map((offer) => (
                  <tr
                    key={offer.id}
                    className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50`}
                  >
                    <td className="py-3 px-4 text-sm">
                      <button
                        onClick={() => copyOfferString(offer.offerString)}
                        className={`bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-2 py-1 rounded text-xs font-mono transition-all duration-300 cursor-pointer group relative overflow-hidden max-w-[200px] sm:max-w-[250px] ${
                          isCopied === offer.offerString
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                            : ''
                        }`}
                        title={
                          isCopied === offer.offerString ? 'Copied!' : 'Click to copy offer string'
                        }
                      >
                        <span className="transition-all duration-300 truncate block">
                          {offer.offerString?.slice(0, 12) || 'Unknown'}...
                        </span>
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(
                          offer.status
                        )}`}
                      >
                        {offer.status}
                      </span>
                    </td>
                    <td className={`py-3 px-4 text-sm ${t.text}`}>
                      <div className="space-y-1">
                        {(offer.assetsOffered || []).slice(0, 2).map((asset, idx) => (
                          <div
                            key={`offered-${asset.assetId}-${idx}`}
                            className="text-xs flex items-center justify-between"
                          >
                            <span className="font-medium">
                              {formatAssetAmount(asset.amount, asset.type)}
                            </span>
                            <span className={`${t.textSecondary} ml-2`}>
                              {getTickerSymbol(asset.assetId)}
                            </span>
                          </div>
                        ))}
                        {(offer.assetsOffered || []).length > 2 && (
                          <div className={`text-xs ${t.textSecondary} font-medium`}>
                            +{(offer.assetsOffered || []).length - 2} more
                          </div>
                        )}
                      </div>
                    </td>
                    <td className={`py-3 px-4 text-sm ${t.textSecondary}`}>
                      {formatDate(offer.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewOffer(offer)}
                          className={`text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm flex items-center`}
                        >
                          <Eye size={14} className="mr-1" />
                          View
                        </button>
                        {offer.status === 'active' && (
                          <button
                            onClick={() => cancelOffer(offer)}
                            className={`text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm flex items-center`}
                          >
                            <XIcon size={14} className="mr-1" />
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4 pb-8">
            {filteredOffers.map((offer) => (
              <div
                key={offer.id}
                className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4`}
              >
                {/* Header with Offer String and Status */}
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => copyOfferString(offer.offerString)}
                    className={`bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-2 py-1 rounded text-xs font-mono transition-all duration-300 cursor-pointer group relative overflow-hidden max-w-[200px] sm:max-w-[250px] ${
                      isCopied === offer.offerString
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                        : ''
                    }`}
                    title={
                      isCopied === offer.offerString ? 'Copied!' : 'Click to copy offer string'
                    }
                  >
                    <span className="transition-all duration-300 truncate block">
                      {offer.offerString?.slice(0, 12) || 'Unknown'}...
                    </span>
                  </button>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium shrink-0 ${getStatusClass(
                      offer.status
                    )}`}
                  >
                    {offer.status}
                  </span>
                </div>

                {/* Assets Section */}
                <div className="mb-3">
                  <div className={`text-xs font-medium ${t.textSecondary} mb-2`}>
                    Assets Offered ({(offer.assetsOffered || []).length})
                  </div>
                  <div className="space-y-1">
                    {(offer.assetsOffered || []).slice(0, 3).map((asset, idx) => (
                      <div
                        key={`mobile-offered-${asset.assetId}-${idx}`}
                        className="flex items-center justify-between text-xs py-1"
                      >
                        <span className="font-medium">
                          {formatAssetAmount(asset.amount, asset.type)}
                        </span>
                        <span className={t.textSecondary}>{getTickerSymbol(asset.assetId)}</span>
                      </div>
                    ))}
                    {(offer.assetsOffered || []).length > 3 && (
                      <div className={`text-xs ${t.textSecondary} font-medium`}>
                        +{(offer.assetsOffered || []).length - 3} more assets
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer with Date and Actions */}
                <div
                  className={`flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700`}
                >
                  <span className={`text-xs ${t.textSecondary}`}>
                    {formatDate(offer.createdAt)}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleViewOffer(offer)}
                      className={`text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-xs flex items-center`}
                    >
                      <Eye size={12} className="mr-1" />
                      View
                    </button>
                    {offer.status === 'active' && (
                      <button
                        onClick={() => cancelOffer(offer)}
                        className={`text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs flex items-center`}
                      >
                        <XIcon size={12} className="mr-1" />
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={Handshake}
          message="No offers found. Create your first offer to start trading."
        />
      )}

      {/* Pagination Controls */}
      {filteredOffers.length > 0 && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 gap-4">
          <div className={`text-sm ${t.textSecondary}`}>
            Showing {Math.min((currentPage - 1) * pageSize + 1, totalOffers)} to{' '}
            {Math.min(currentPage * pageSize, totalOffers)} of {totalOffers} offers
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-3 py-2 rounded-lg border ${
                currentPage === 1
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'
              } ${t.border} ${t.text}`}
            >
              <ChevronLeft size={16} />
            </button>
            {getPageNumbers().map((page, idx) => (
              <button
                key={idx}
                onClick={() => typeof page === 'number' && goToPage(page)}
                disabled={typeof page !== 'number'}
                className={`px-3 py-2 rounded-lg border min-w-[40px] ${
                  page === currentPage
                    ? `${t.card} ${t.border} font-semibold`
                    : typeof page === 'number'
                      ? `hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${t.border} ${t.text}`
                      : 'border-transparent cursor-default'
                } ${t.text}`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-3 py-2 rounded-lg border ${
                currentPage === totalPages
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'
              } ${t.border} ${t.text}`}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Cancel All Confirmation Modal */}
      {showCancelAllConfirmation && (
        <Modal onClose={handleCancelAllDialogClose} maxWidth="max-w-md" closeOnOverlayClick={false}>
          <div className="p-6">
            <h3 className={`text-lg font-semibold ${t.text} mb-2`}>Cancel All Active Offers</h3>
            <p className={`${t.textSecondary} mb-4`}>
              Are you sure you want to cancel all active offers? This action cannot be undone.
            </p>
            {cancelAllError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-700 dark:text-red-300">{cancelAllError}</p>
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <button
                onClick={handleCancelAllDialogClose}
                className={`px-4 py-2 rounded-lg border ${t.border} ${t.text} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
              >
                Keep Offers
              </button>
              <button
                onClick={confirmCancelAllOffers}
                disabled={isCancellingAll}
                className={`px-4 py-2 rounded-lg border border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors`}
              >
                {isCancellingAll ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <Ban size={14} />
                    Cancel All Offers
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete All Confirmation Modal */}
      {showDeleteAllConfirmation && (
        <Modal onClose={handleDeleteAllDialogClose} maxWidth="max-w-md" closeOnOverlayClick={false}>
          <div className="p-6">
            <h3 className={`text-lg font-semibold ${t.text} mb-2`}>Delete All Offers</h3>
            <p className={`${t.textSecondary} mb-4`}>
              Are you sure you want to delete all offers? This action cannot be undone and will
              permanently remove all offers from your storage.
            </p>
            {deleteAllError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-700 dark:text-red-300">{deleteAllError}</p>
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <button
                onClick={handleDeleteAllDialogClose}
                className={`px-4 py-2 rounded-lg border ${t.border} ${t.text} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
              >
                Keep Offers
              </button>
              <button
                onClick={confirmDeleteAllOffers}
                disabled={isDeletingAll}
                className={`px-4 py-2 rounded-lg border border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors`}
              >
                {isDeletingAll ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Delete All Offers
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
