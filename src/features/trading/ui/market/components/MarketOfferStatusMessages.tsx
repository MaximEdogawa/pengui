'use client'

import { useThemeClasses } from '@/shared/hooks'
import { Loader2 } from 'lucide-react'

interface MarketOfferStatusMessagesProps {
  isLoadingOfferString: boolean
  parseError: string
  isPosting: boolean
  errorMessage: string
  successMessage: string
}

export default function MarketOfferStatusMessages({
  isLoadingOfferString,
  parseError,
  isPosting,
  errorMessage,
  successMessage,
}: MarketOfferStatusMessagesProps) {
  const { t } = useThemeClasses()

  return (
    <>
      {isLoadingOfferString && (
        <div className="flex items-center justify-center py-4">
          <Loader2 size={16} className="animate-spin text-blue-600 dark:text-blue-400 mr-2" />
          <span className={`text-xs ${t.textSecondary}`}>Loading offer details...</span>
        </div>
      )}

      {parseError && (
        <div
          className={`p-2 rounded-lg border ${t.border} backdrop-blur-xl ${
            parseError.includes('validated')
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}
        >
          <p
            className={`text-xs ${
              parseError.includes('validated')
                ? 'text-blue-700 dark:text-blue-300'
                : 'text-red-700 dark:text-red-300'
            }`}
          >
            {parseError}
          </p>
        </div>
      )}

      {isPosting && (
        <div className="flex items-center py-2">
          <Loader2 size={12} className="animate-spin text-blue-600 dark:text-blue-400 mr-2" />
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Processing offer with Dexie marketplace...
          </p>
        </div>
      )}

      {errorMessage && (
        <div
          className={`p-2 rounded-lg border ${t.border} backdrop-blur-xl bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800`}
        >
          <p className="text-xs text-red-700 dark:text-red-300">{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div
          className={`p-2 rounded-lg border ${t.border} backdrop-blur-xl bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800`}
        >
          <p className="text-xs text-green-700 dark:text-green-300">{successMessage}</p>
        </div>
      )}
    </>
  )
}
