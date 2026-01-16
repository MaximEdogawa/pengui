/**
 * State management for useMyOffers hook
 * Extracted to reduce complexity
 */

import { useState } from 'react'
import type { OfferDetails, OfferFilters } from '@/entities/offer'

export interface UseMyOffersState {
  offers: OfferDetails[]
  isLoading: boolean
  selectedOffer: OfferDetails | null
  isCopied: string | null
  showCancelConfirmation: boolean
  offerToCancel: OfferDetails | null
  isCancelling: boolean
  cancelError: string
  showCancelAllConfirmation: boolean
  isCancellingAll: boolean
  cancelAllError: string
  showDeleteAllConfirmation: boolean
  isDeletingAll: boolean
  deleteAllError: string
  filters: OfferFilters
  currentPage: number
  pageSize: number
  totalOffers: number
  totalPages: number
}

export interface UseMyOffersSetters {
  setOffers: React.Dispatch<React.SetStateAction<OfferDetails[]>>
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
  setSelectedOffer: React.Dispatch<React.SetStateAction<OfferDetails | null>>
  setIsCopied: React.Dispatch<React.SetStateAction<string | null>>
  setShowCancelConfirmation: React.Dispatch<React.SetStateAction<boolean>>
  setOfferToCancel: React.Dispatch<React.SetStateAction<OfferDetails | null>>
  setIsCancelling: React.Dispatch<React.SetStateAction<boolean>>
  setCancelError: React.Dispatch<React.SetStateAction<string>>
  setShowCancelAllConfirmation: React.Dispatch<React.SetStateAction<boolean>>
  setIsCancellingAll: React.Dispatch<React.SetStateAction<boolean>>
  setCancelAllError: React.Dispatch<React.SetStateAction<string>>
  setShowDeleteAllConfirmation: React.Dispatch<React.SetStateAction<boolean>>
  setIsDeletingAll: React.Dispatch<React.SetStateAction<boolean>>
  setDeleteAllError: React.Dispatch<React.SetStateAction<string>>
  setFilters: React.Dispatch<React.SetStateAction<OfferFilters>>
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>
  setPageSize: React.Dispatch<React.SetStateAction<number>>
  setTotalOffers: React.Dispatch<React.SetStateAction<number>>
  setTotalPages: React.Dispatch<React.SetStateAction<number>>
}

/**
 * Initialize all state for useMyOffers hook
 */
export function useMyOffersState(): UseMyOffersState & UseMyOffersSetters {
  const [offers, setOffers] = useState<OfferDetails[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedOffer, setSelectedOffer] = useState<OfferDetails | null>(null)
  const [isCopied, setIsCopied] = useState<string | null>(null)
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false)
  const [offerToCancel, setOfferToCancel] = useState<OfferDetails | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [showCancelAllConfirmation, setShowCancelAllConfirmation] = useState(false)
  const [isCancellingAll, setIsCancellingAll] = useState(false)
  const [cancelAllError, setCancelAllError] = useState('')
  const [showDeleteAllConfirmation, setShowDeleteAllConfirmation] = useState(false)
  const [isDeletingAll, setIsDeletingAll] = useState(false)
  const [deleteAllError, setDeleteAllError] = useState('')
  const [filters, setFilters] = useState<OfferFilters>({ status: '' })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalOffers, setTotalOffers] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  return {
    offers,
    isLoading,
    selectedOffer,
    isCopied,
    showCancelConfirmation,
    offerToCancel,
    isCancelling,
    cancelError,
    showCancelAllConfirmation,
    isCancellingAll,
    cancelAllError,
    showDeleteAllConfirmation,
    isDeletingAll,
    deleteAllError,
    filters,
    currentPage,
    pageSize,
    totalOffers,
    totalPages,
    setOffers,
    setIsLoading,
    setSelectedOffer,
    setIsCopied,
    setShowCancelConfirmation,
    setOfferToCancel,
    setIsCancelling,
    setCancelError,
    setShowCancelAllConfirmation,
    setIsCancellingAll,
    setCancelAllError,
    setShowDeleteAllConfirmation,
    setIsDeletingAll,
    setDeleteAllError,
    setFilters,
    setCurrentPage,
    setPageSize,
    setTotalOffers,
    setTotalPages,
  }
}
