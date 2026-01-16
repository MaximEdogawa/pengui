'use client'

import { useCallback } from 'react'
import { useMyOffersData } from './hooks/useMyOffersData'
import { useMyOffersActions } from './hooks/useMyOffersActions'
import { useMyOffersUtils } from './hooks/useMyOffersUtils'

/**
 * Hook for managing user's offers
 * Provides offer loading, filtering, and management functionality
 * Composed from smaller hooks for better maintainability
 */
export function useMyOffers() {
  // Data management (loading, syncing, filtering)
  const { state, filteredOffers, refreshOffers } = useMyOffersData()

  // Actions (cancel, delete, update, etc.)
  const actions = useMyOffersActions({ state, refreshOffers })

  // Utilities (formatting, copying, etc.)
  const utils = useMyOffersUtils({ state })

  // Pagination handlers
  const goToPage = useCallback(
    (page: number) => {
      state.setCurrentPage(Math.max(1, Math.min(page, state.totalPages || 1)))
    },
    [state]
  )

  const changePageSize = useCallback(
    (newPageSize: number) => {
      state.setPageSize(newPageSize)
      state.setCurrentPage(1)
    },
    [state]
  )

  return {
    // State
    offers: state.offers,
    isLoading: state.isLoading,
    selectedOffer: state.selectedOffer,
    isCopied: state.isCopied,
    showCancelConfirmation: state.showCancelConfirmation,
    offerToCancel: state.offerToCancel,
    isCancelling: state.isCancelling,
    cancelError: state.cancelError,
    showCancelAllConfirmation: state.showCancelAllConfirmation,
    isCancellingAll: state.isCancellingAll,
    cancelAllError: state.cancelAllError,
    showDeleteAllConfirmation: state.showDeleteAllConfirmation,
    isDeletingAll: state.isDeletingAll,
    deleteAllError: state.deleteAllError,
    filters: state.filters,
    setFilters: state.setFilters,

    // Pagination
    currentPage: state.currentPage,
    pageSize: state.pageSize,
    totalOffers: state.totalOffers,
    totalPages: state.totalPages,
    goToPage,
    changePageSize,

    // Computed
    filteredOffers,

    // Methods
    refreshOffers,
    ...actions,
    ...utils,
  }
}
