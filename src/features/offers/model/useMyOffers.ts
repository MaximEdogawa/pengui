'use client'

import type { OfferDetails } from '@/entities/offer'
import { useCancelOffer } from '@/features/wallet'
import { useCatTokens } from '@/shared/hooks'
import { formatAssetAmount } from '@/shared/lib/utils/chia-units'
import { useCallback, useEffect, useMemo } from 'react'
import { trackEffectRun } from '@/shared/lib/utils/useEffectGuard'
import { useOfferStorage } from './useOfferStorage'
import {
  createOfferCreatedEvent,
  updateOfferStatus,
  removeOfferFromState,
  updateOfferInState,
  cancelAllActiveOffers,
} from './useMyOffersHandlers'
import { useMyOffersState } from './useMyOffersState'

/**
 * Hook for managing user's offers
 * Provides offer loading, filtering, and management functionality
 */
export function useMyOffers() {
  // Services
  const cancelOfferMutation = useCancelOffer()
  const offerStorage = useOfferStorage()
  const { getCatTokenInfo } = useCatTokens()

  // State (extracted to separate hook)
  const state = useMyOffersState()

  // Computed - offers are already filtered by status in the query
  const filteredOffers = useMemo(() => state.offers, [state.offers])

  // Extract stable references
  const loadOffersFromStorage = offerStorage.loadOffers
  const storageOffers = offerStorage.offers
  const pagination = offerStorage.pagination

  // Extract stable setters (they don't change between renders)
  const {
    setIsLoading,
    setTotalOffers,
    setTotalPages,
    setOffers: setStateOffers,
    setCurrentPage,
  } = state

  // Methods
  const refreshOffers = useCallback(async () => {
    setIsLoading(true)
    try {
      await loadOffersFromStorage({
        page: state.currentPage,
        pageSize: state.pageSize,
        status: state.filters.status || undefined,
      })
    } catch {
      // Failed to refresh offers
    } finally {
      setIsLoading(false)
    }
  }, [loadOffersFromStorage, state.currentPage, state.pageSize, state.filters.status, setIsLoading])

  // Update pagination state when storage pagination changes
  // ⚠️ CRITICAL: Do NOT include 'state' in dependency array!
  // Only depend on 'pagination' which is the external value we're watching
  useEffect(() => {
    trackEffectRun('useMyOffers: pagination-sync')
    if (pagination) {
      setTotalOffers(pagination.total)
      setTotalPages(pagination.totalPages)
    }
  }, [pagination, setTotalOffers, setTotalPages])

  // Sync offers from storage to local state
  // ⚠️ CRITICAL: Do NOT include 'state' in dependency array!
  // Only depend on 'storageOffers' which is the external value we're watching
  useEffect(() => {
    trackEffectRun('useMyOffers: offers-sync')
    const loadedOffers = storageOffers.map((storedOffer) => ({
      id: storedOffer.id,
      tradeId: storedOffer.tradeId,
      offerString: storedOffer.offerString,
      status: storedOffer.status,
      createdAt: storedOffer.createdAt,
      assetsOffered: storedOffer.assetsOffered,
      assetsRequested: storedOffer.assetsRequested,
      fee: storedOffer.fee,
      creatorAddress: storedOffer.creatorAddress,
      dexieOfferId: storedOffer.dexieOfferId,
      dexieStatus: storedOffer.dexieStatus,
      uploadedToDexie: storedOffer.uploadedToDexie,
      dexieOfferData: storedOffer.dexieOfferData,
      expiresAt: storedOffer.expiresAt,
      dateFound: storedOffer.dateFound,
      dateCompleted: storedOffer.dateCompleted,
      datePending: storedOffer.datePending,
      dateExpiry: storedOffer.dateExpiry,
      blockExpiry: storedOffer.blockExpiry,
      spentBlockIndex: storedOffer.spentBlockIndex,
      knownTaker: storedOffer.knownTaker,
    }))
    setStateOffers(loadedOffers)
  }, [storageOffers, setStateOffers])

  const viewOffer = useCallback(
    (offer: OfferDetails | null) => {
      state.setSelectedOffer(offer)
    },
    [state.setSelectedOffer]
  )

  const cancelOffer = useCallback(
    (offer: OfferDetails) => {
      state.setOfferToCancel(offer)
      state.setCancelError('')
      state.setShowCancelConfirmation(true)
    },
    [state.setOfferToCancel, state.setCancelError, state.setShowCancelConfirmation]
  )

  const confirmCancelOffer = useCallback(async () => {
    if (!state.offerToCancel) return

    state.setIsCancelling(true)
    state.setCancelError('')

    try {
      await cancelOfferMutation.mutateAsync({
        id: state.offerToCancel.tradeId,
        fee: state.offerToCancel.fee,
      })
      await offerStorage.updateOffer(state.offerToCancel.id, { status: 'cancelled' })
      state.setShowCancelConfirmation(false)
      state.setOfferToCancel(null)
      await refreshOffers()
    } catch (error) {
      state.setCancelError(
        `Failed to cancel offer: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    } finally {
      state.setIsCancelling(false)
    }
  }, [
    state.offerToCancel,
    state.setIsCancelling,
    state.setCancelError,
    state.setShowCancelConfirmation,
    state.setOfferToCancel,
    cancelOfferMutation,
    offerStorage,
    refreshOffers,
  ])

  const handleCancelDialogClose = useCallback(() => {
    state.setShowCancelConfirmation(false)
    state.setOfferToCancel(null)
    state.setCancelError('')
  }, [state.setShowCancelConfirmation, state.setOfferToCancel, state.setCancelError])

  const handleOfferCreated = useCallback(
    async (offer: OfferDetails) => {
      await refreshOffers()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(createOfferCreatedEvent(offer))
      }
    },
    [refreshOffers]
  )

  const handleOfferTaken = useCallback(
    async (offer: OfferDetails) => {
      setStateOffers((prev) => updateOfferStatus(prev, offer.id, 'completed'))
      await refreshOffers()
    },
    [refreshOffers, setStateOffers]
  )

  const handleOfferCancelled = useCallback(
    async (offer: OfferDetails) => {
      setStateOffers((prev) => updateOfferStatus(prev, offer.id, 'cancelled'))
      state.setSelectedOffer(null)
      await refreshOffers()
    },
    [refreshOffers, setStateOffers, state.setSelectedOffer]
  )

  const handleOfferDeleted = useCallback(
    async (offer: OfferDetails) => {
      setStateOffers((prev) => removeOfferFromState(prev, offer.id))
      state.setSelectedOffer(null)
      await refreshOffers()
    },
    [refreshOffers, setStateOffers, state.setSelectedOffer]
  )

  const handleOfferUpdated = useCallback(
    async (offer: OfferDetails) => {
      setStateOffers((prev) => updateOfferInState(prev, offer))
      state.setSelectedOffer((prev) => (prev && prev.id === offer.id ? { ...prev, ...offer } : prev))
      await refreshOffers()
    },
    [refreshOffers, setStateOffers, state.setSelectedOffer]
  )

  const getStatusClass = useCallback((status: string) => {
    const classes = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
      active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
      completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
      expired: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
    }
    return classes[status as keyof typeof classes] || classes.pending
  }, [])

  const formatDate = useCallback((date: Date) => {
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
  }, [])

  const copyOfferString = useCallback(
    async (offerString: string) => {
      if (!offerString) return

      try {
        await navigator.clipboard.writeText(offerString)
        state.setIsCopied(offerString)
        setTimeout(() => {
          state.setIsCopied(null)
        }, 2000)
      } catch {
        // Failed to copy offer string
      }
    },
    [state.setIsCopied]
  )

  const getTickerSymbol = useCallback(
    (assetId: string): string => {
      const tokenInfo = getCatTokenInfo(assetId)
      // Guard against undefined tokenInfo and return safe fallback
      return tokenInfo?.ticker || assetId || 'Unknown'
    },
    [getCatTokenInfo]
  )

  // Pagination handlers
  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(Math.max(1, Math.min(page, state.totalPages || 1)))
    },
    [setCurrentPage, state.totalPages]
  )

  const changePageSize = useCallback(
    (newPageSize: number) => {
      state.setPageSize(newPageSize)
      setCurrentPage(1)
    },
    [state.setPageSize, setCurrentPage]
  )

  // Update page when filters change
  // ⚠️ CRITICAL: Do NOT include 'state' in dependency array!
  useEffect(() => {
    trackEffectRun('useMyOffers: filter-change')
    setCurrentPage(1)
  }, [state.filters.status, setCurrentPage])

  // Refresh offers when page, pageSize, or filters change
  // ⚠️ CRITICAL: Only depend on specific values, not the entire state object!
  useEffect(() => {
    trackEffectRun('useMyOffers: refresh-offers')
    refreshOffers()
  }, [state.currentPage, state.pageSize, state.filters.status, refreshOffers])

  // Cancel all active offers
  const cancelAllOffers = useCallback(() => {
    state.setShowCancelAllConfirmation(true)
    state.setCancelAllError('')
  }, [state.setShowCancelAllConfirmation, state.setCancelAllError])

  const confirmCancelAllOffers = useCallback(async () => {
    state.setIsCancellingAll(true)
    state.setCancelAllError('')

    try {
      const activeOffers = await offerStorage.getOffersByStatus('active')

      if (activeOffers.length === 0) {
        state.setCancelAllError('No active offers to cancel')
        state.setIsCancellingAll(false)
        return
      }

      await cancelAllActiveOffers(activeOffers, cancelOfferMutation, offerStorage.updateOffer)
      state.setShowCancelAllConfirmation(false)
      await refreshOffers()
    } catch (error) {
      state.setCancelAllError(
        `Failed to cancel all offers: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    } finally {
      state.setIsCancellingAll(false)
    }
  }, [
    state.setIsCancellingAll,
    state.setCancelAllError,
    state.setShowCancelAllConfirmation,
    cancelOfferMutation,
    offerStorage,
    refreshOffers,
  ])

  const handleCancelAllDialogClose = useCallback(() => {
    state.setShowCancelAllConfirmation(false)
    state.setCancelAllError('')
  }, [state.setShowCancelAllConfirmation, state.setCancelAllError])

  // Delete all offers
  const deleteAllOffers = useCallback(() => {
    state.setShowDeleteAllConfirmation(true)
    state.setDeleteAllError('')
  }, [state.setShowDeleteAllConfirmation, state.setDeleteAllError])

  const confirmDeleteAllOffers = useCallback(async () => {
    state.setIsDeletingAll(true)
    state.setDeleteAllError('')

    try {
      await offerStorage.clearAllOffers()
      setStateOffers([])
      setTotalOffers(0)
      setTotalPages(0)
      setCurrentPage(1)
      state.setShowDeleteAllConfirmation(false)
    } catch (error) {
      state.setDeleteAllError(
        `Failed to delete all offers: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    } finally {
      state.setIsDeletingAll(false)
    }
  }, [
    state.setIsDeletingAll,
    state.setDeleteAllError,
    state.setShowDeleteAllConfirmation,
    setStateOffers,
    setTotalOffers,
    setTotalPages,
    setCurrentPage,
    offerStorage,
  ])

  const handleDeleteAllDialogClose = useCallback(() => {
    state.setShowDeleteAllConfirmation(false)
    state.setDeleteAllError('')
  }, [state.setShowDeleteAllConfirmation, state.setDeleteAllError])

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
    viewOffer,
    cancelOffer,
    confirmCancelOffer,
    handleCancelDialogClose,
    cancelAllOffers,
    confirmCancelAllOffers,
    handleCancelAllDialogClose,
    deleteAllOffers,
    confirmDeleteAllOffers,
    handleDeleteAllDialogClose,
    handleOfferCreated,
    handleOfferTaken,
    handleOfferCancelled,
    handleOfferDeleted,
    handleOfferUpdated,
    getStatusClass,
    formatDate,
    copyOfferString,

    // Utilities
    getTickerSymbol,
    formatAssetAmount,
  }
}
