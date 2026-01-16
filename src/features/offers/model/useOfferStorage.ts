'use client'

import type { StoredOffer } from '@/shared/lib/database/indexedDB'
import { useMemo, useState } from 'react'
import { useOfferCRUD } from './hooks/useOfferCRUD'
import { useOfferQueries } from './hooks/useOfferQueries'

export function useOfferStorage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offers, setOffers] = useState<StoredOffer[]>([])
  const [pagination, setPagination] = useState<{
    total: number
    page: number
    pageSize: number
    totalPages: number
  } | null>(null)

  // Computed properties
  const localOffers = useMemo(() => offers.filter((offer) => offer.isLocal), [offers])
  const syncedOffers = useMemo(() => offers.filter((offer) => !offer.isLocal), [offers])
  const activeOffers = useMemo(() => offers.filter((offer) => offer.status === 'active'), [offers])
  const cancelledOffers = useMemo(
    () => offers.filter((offer) => offer.status === 'cancelled'),
    [offers]
  )

  // CRUD operations
  const crud = useOfferCRUD({
    setIsLoading,
    setError,
    setOffers,
    setPagination,
  })

  // Query operations
  const queries = useOfferQueries({
    setIsLoading,
    setError,
    setOffers,
  })

  return {
    // State
    isLoading,
    error,
    offers,
    pagination,

    // Computed
    localOffers,
    syncedOffers,
    activeOffers,
    cancelledOffers,

    // Methods
    loadOffers: crud.loadOffers,
    saveOffer: crud.saveOffer,
    updateOffer: crud.updateOffer,
    deleteOffer: crud.deleteOffer,
    clearAllOffers: crud.clearAllOffers,
    getOffersByStatus: queries.getOffersByStatus,
    getUnsyncedOffers: queries.getUnsyncedOffers,
    markOffersAsSynced: queries.markOffersAsSynced,
    getStats: queries.getStats,
  }
}
