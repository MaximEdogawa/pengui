'use client'

import { useThemeClasses } from '@/shared/hooks'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useMemo } from 'react'

interface TradeHistoryPaginationProps {
  totalTrades: number
  pageSize?: number
}

export default function TradeHistoryPagination({
  totalTrades,
  pageSize = 50,
}: TradeHistoryPaginationProps) {
  const { t } = useThemeClasses()
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = useMemo(() => {
    return Math.ceil(totalTrades / pageSize)
  }, [totalTrades, pageSize])

  const startIndex = useMemo(() => {
    return (currentPage - 1) * pageSize + 1
  }, [currentPage, pageSize])

  const endIndex = useMemo(() => {
    return Math.min(currentPage * pageSize, totalTrades)
  }, [currentPage, pageSize, totalTrades])

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  if (totalPages <= 1) {
    return null
  }

  return (
    <div className={`p-3 flex items-center justify-between ${t.border} border-t`}>
      <div className={`text-xs ${t.textSecondary}`}>
        Showing {startIndex}-{endIndex} of {totalTrades} trades
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className={`p-1 rounded ${t.cardHover} ${
            currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className={`text-xs ${t.text}`}>
          Page {currentPage} of {totalPages}
        </div>

        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`p-1 rounded ${t.cardHover} ${
            currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
