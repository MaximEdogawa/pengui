'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ThemeClasses } from '@/shared/lib/theme'

interface OfferHistoryPaginationProps {
  currentPage: number
  totalPages: number
  totalOffers: number
  pageSize: number
  onPageChange: (page: number) => void
  t: ThemeClasses
}

export function OfferHistoryPagination({
  currentPage,
  totalPages,
  totalOffers,
  pageSize,
  onPageChange,
  t,
}: OfferHistoryPaginationProps) {
  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = []
    const maxPagesToShow = 5

    if (totalPages <= maxPagesToShow) {
      pages.push(...Array.from({ length: totalPages }, (_, i) => i + 1))
    } else {
      pages.push(1)

      let start = Math.max(2, currentPage - 1)
      let end = Math.min(totalPages - 1, currentPage + 1)

      if (currentPage <= 3) {
        end = Math.min(4, totalPages - 1)
      }

      if (currentPage >= totalPages - 2) {
        start = Math.max(2, totalPages - 3)
      }

      if (start > 2) {
        pages.push('...')
      }

      pages.push(...Array.from({ length: end - start + 1 }, (_, i) => start + i))

      if (end < totalPages - 1) {
        pages.push('...')
      }

      if (totalPages > 1) {
        pages.push(totalPages)
      }
    }

    return pages
  }

  if (totalPages <= 1) {
    return null
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 gap-4">
      <div className={`text-sm ${t.textSecondary}`}>
        Showing {Math.min((currentPage - 1) * pageSize + 1, totalOffers)} to{' '}
        {Math.min(currentPage * pageSize, totalOffers)} of {totalOffers} offers
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
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
            onClick={() => typeof page === 'number' && onPageChange(page)}
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
          onClick={() => onPageChange(currentPage + 1)}
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
  )
}
