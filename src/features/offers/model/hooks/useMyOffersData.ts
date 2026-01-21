'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { trackEffectRun } from '@/shared/lib/utils/useEffectGuard'
import { useOfferStorage } from '../useOfferStorage'
import { useMyOffersState } from '../useMyOffersState'

/**
 * Hook for managing offer data loading and synchronization
 */
export function useMyOffersData() {
  const offerStorage = useOfferStorage()
  const state = useMyOffersState()

  // Extract stable references
  const loadOffersFromStorage = offerStorage.loadOffers
  const storageOffers = offerStorage.offers
  const pagination = offerStorage.pagination

  // Extract stable setters
  const {
    setIsLoading,
    setTotalOffers,
    setTotalPages,
    setOffers: setStateOffers,
    setCurrentPage,
  } = state

  // Create stable pagination reference using JSON.stringify for deep comparison
  const paginationKey = useMemo(() => {
    if (!pagination) return null
    return JSON.stringify({
      total: pagination.total,
      totalPages: pagination.totalPages,
      page: pagination.page,
      pageSize: pagination.pageSize,
    })
  }, [pagination])
  const prevPaginationKeyRef = useRef<string | null>(null)
  // Store latest pagination in ref to access it in effect without dependency
  const paginationRef = useRef<typeof pagination>(pagination)
  useEffect(() => {
    paginationRef.current = pagination
  }, [pagination])

  // Create stable offers reference using length and IDs
  const offersKey = useMemo(
    () => storageOffers.map((o) => o.id).join(','),
    [storageOffers]
  )
  const prevOffersKeyRef = useRef<string>('')
  // Store latest storageOffers in ref to access it in effect without dependency
  const storageOffersRef = useRef<typeof storageOffers>(storageOffers)
  useEffect(() => {
    storageOffersRef.current = storageOffers
  }, [storageOffers])

  // Refresh offers function
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
  useEffect(() => {
    trackEffectRun('useMyOffersData: pagination-sync')
    // Only update if pagination actually changed
    if (paginationKey && paginationKey !== prevPaginationKeyRef.current) {
      prevPaginationKeyRef.current = paginationKey
      // Use ref to access latest pagination without adding it to dependencies
      const currentPagination = paginationRef.current
      if (currentPagination) {
        setTotalOffers(currentPagination.total)
        setTotalPages(currentPagination.totalPages)
      }
    }
    // Only depend on paginationKey - pagination object reference changes on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationKey])

  // Sync offers from storage to local state
  useEffect(() => {
    trackEffectRun('useMyOffersData: offers-sync')
    // Only update if offers actually changed
    if (offersKey !== prevOffersKeyRef.current) {
      prevOffersKeyRef.current = offersKey
      // Use ref to access latest storageOffers without adding it to dependencies
      const loadedOffers = storageOffersRef.current.map((storedOffer) => ({
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
    }
    // Only depend on offersKey - storageOffers array reference changes on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offersKey])

  // Update page when filters change
  useEffect(() => {
    trackEffectRun('useMyOffersData: filter-change')
    setCurrentPage(1)
  }, [state.filters.status, setCurrentPage])

  // Refresh offers when page, pageSize, or filters change
  // refreshOffers is a stable callback (useCallback) that includes loadOffersFromStorage and setIsLoading
  // in its dependency array. These are guaranteed stable references from hooks, so refreshOffers will
  // always capture the latest values. We depend on primitive state values to trigger refreshes.
  useEffect(() => {
    trackEffectRun('useMyOffersData: refresh-offers')
    refreshOffers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentPage, state.pageSize, state.filters.status])

  // Computed - offers are already filtered by status in the query
  const filteredOffers = useMemo(() => state.offers, [state.offers])

  return {
    state,
    filteredOffers,
    refreshOffers,
  }
}
