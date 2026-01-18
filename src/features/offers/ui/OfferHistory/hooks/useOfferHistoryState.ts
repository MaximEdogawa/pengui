import { useEffect } from 'react'
import type { OfferDetails } from '@/entities/offer'
import { useMyOffers } from '../../../model'

interface UseOfferHistoryStateProps {
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
  currentPage?: number
  pageSize?: number
  totalOffers?: number
  totalPages?: number
  goToPage?: (page: number) => void
  changePageSize?: (pageSize: number) => void
}

export function useOfferHistoryState(props: UseOfferHistoryStateProps) {
  const hookData = useMyOffers()
  const {
    isLoading: hookIsLoading,
    filteredOffers: hookFilteredOffers,
    filters: hookFilters,
    setFilters: hookSetFilters,
    refreshOffers: hookRefreshOffers,
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

  const isLoading = props.isLoading ?? hookIsLoading
  const filteredOffers = props.offers ?? hookFilteredOffers
  const filters = props.filters ?? hookFilters
  const setFilters = props.setFilters ?? hookSetFilters
  const getStatusClass = props.getStatusClass ?? hookGetStatusClass
  const formatDate = props.formatDate ?? hookFormatDate
  const copyOfferString = props.copyOfferString ?? hookCopyOfferString
  const getTickerSymbol = props.getTickerSymbol ?? hookGetTickerSymbol
  const isCopied = props.isCopied ?? hookIsCopied
  const refreshOffers = props.refreshOffers ?? hookRefreshOffers
  const currentPage = props.currentPage ?? hookCurrentPage
  const pageSize = props.pageSize ?? hookPageSize
  const totalOffers = props.totalOffers ?? hookTotalOffers
  const totalPages = props.totalPages ?? hookTotalPages
  const goToPage = props.goToPage ?? hookGoToPage
  const changePageSize = props.changePageSize ?? hookChangePageSize

  useEffect(() => {
    if (!props.offers && refreshOffers) {
      refreshOffers()
    }
  }, [props.offers, refreshOffers])

  return {
    isLoading,
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
  }
}
