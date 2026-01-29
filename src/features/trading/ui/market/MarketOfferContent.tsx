'use client'

import { type OfferDetails } from '@/entities/offer'
import { useOfferInspection } from '@/features/offers/hooks/useOfferInspection'
import { useThemeClasses } from '@/shared/hooks'
import { formatXchAmount, getMinimumFeeInXch, formatAssetAmountForInput, getAmountPlaceholder } from '@/shared/lib/utils/chia-units'
import { logger } from '@/shared/lib/logger'
import { useEffect } from 'react'
import type { OrderBookFilters, OrderBookOrder } from '../../lib/orderBookTypes'
import { useMarketOfferForm } from './hooks/useMarketOfferForm'
import { useMarketOfferSubmission } from './hooks/useMarketOfferSubmission'
import { useOfferParsing } from './hooks/useOfferParsing'
import { useOrderPrice } from './hooks/useOrderPrice'
import MarketOfferFormInputs from './components/MarketOfferFormInputs'
import MarketOfferActions from './components/MarketOfferActions'
import MarketOfferStatusMessages from './components/MarketOfferStatusMessages'
import OfferPreview from './components/OfferPreview'
import OrderDetailsCollapsible from './components/OrderDetailsCollapsible'

interface MarketOfferTabProps {
  order?: OrderBookOrder
  onOfferTaken?: (offer: OfferDetails) => void
  onClose?: () => void // Only used in modal mode
  mode?: 'modal' | 'inline' // Determines styling and layout
  filters?: OrderBookFilters
}


export default function MarketOfferTab({
  order,
  onOfferTaken,
  onClose,
  mode = 'inline',
  filters,
}: MarketOfferTabProps) {
  const { isPosting } = useOfferInspection()
  const { t } = useThemeClasses()

  // Use extracted hooks
  const formState = useMarketOfferForm()
  const { offerPreview, parseError, fetchedOfferString, isLoadingOfferString, offerDetailsQuery } =
    useOfferParsing({
      order,
      offerString: formState.offerString,
    })
  const { orderType, orderPrice, priceDeviationPercent, getPriceHeaderTicker, getTickerSymbol } =
    useOrderPrice(order, filters)

  // Update offer string when query data changes
  useEffect(() => {
    formState.setErrorMessage('')
    formState.setSuccessMessage('')

    if (fetchedOfferString) {
      formState.setOfferString(fetchedOfferString)
    } else if (!order?.id) {
      formState.resetForm()
    }
  }, [fetchedOfferString, order?.id, formState])

  // Handle query errors
  useEffect(() => {
    if (offerDetailsQuery.isError && order?.id) {
      const errorMsg =
        offerDetailsQuery.error instanceof Error
          ? offerDetailsQuery.error.message
          : 'Failed to fetch offer details'
      formState.setErrorMessage(errorMsg)
      logger.error('Error fetching offer details:', offerDetailsQuery.error)
    }
  }, [offerDetailsQuery.isError, offerDetailsQuery.error, order?.id, formState])

  const isFormValid =
    formState.offerString.trim().length > 0 &&
    formState.fee >= 0 &&
    (!parseError || parseError.includes('validated'))

  const { handleSubmit } = useMarketOfferSubmission({
    formState,
    isFormValid,
    offerPreview,
    onOfferTaken,
    onClose,
    mode,
    order,
  })

  const containerClass = mode === 'modal' ? 'space-y-4' : 'space-y-3'

  return (
    <div className={containerClass}>
      <form onSubmit={handleSubmit} className={containerClass}>
        {/* Offer String Input (only when no order) */}
        <MarketOfferFormInputs
          order={order}
          offerString={formState.offerString}
          setOfferString={formState.setOfferString}
          isSubmitting={formState.isSubmitting}
        />

        {/* Offer Preview */}
        {offerPreview && (
          <OfferPreview
            offerPreview={offerPreview}
            orderPrice={orderPrice}
            priceDeviationPercent={priceDeviationPercent}
            getPriceHeaderTicker={getPriceHeaderTicker}
            getTickerSymbol={getTickerSymbol}
            fee={formState.fee}
          />
        )}

        {/* Transaction Fee - After preview, before action buttons */}
        <div>
          <label className={`block text-xs font-medium ${t.text} mb-1.5`}>
            Transaction Fee (XCH)
          </label>
          <input
            type="text"
            inputMode="decimal"
            pattern="[0-9]*\.?[0-9]*"
            value={
              formState.feeInput !== undefined
                ? formState.feeInput
                : formState.fee && formState.fee > 0
                  ? formatAssetAmountForInput(formState.fee, 'xch')
                  : ''
            }
            onChange={(e) => formState.handleFeeChange(e.target.value)}
            onBlur={formState.handleFeeBlur}
            placeholder={getAmountPlaceholder('xch')}
            className={`w-full px-2 py-1.5 border rounded-lg text-xs ${t.input} ${t.border} backdrop-blur-xl`}
            disabled={formState.isSubmitting}
          />
          <p className={`mt-1 text-xs ${t.textSecondary}`}>
            Fee can be 0 for free transactions (minimum: {formatXchAmount(getMinimumFeeInXch())} XCH)
          </p>
        </div>

        {/* Action Buttons */}
        <MarketOfferActions
          mode={mode}
          onClose={onClose}
          isFormValid={isFormValid}
          isSubmitting={formState.isSubmitting}
          orderType={orderType}
          order={order}
        />

        {/* Status Messages */}
        <MarketOfferStatusMessages
          isLoadingOfferString={isLoadingOfferString}
          parseError={parseError}
          isPosting={isPosting}
          errorMessage={formState.errorMessage}
          successMessage={formState.successMessage}
        />
      </form>

      {order && (
        <OrderDetailsCollapsible
          order={order}
          offerString={fetchedOfferString || formState.offerString}
          mode={mode}
          priceDeviationPercent={priceDeviationPercent}
        />
      )}
    </div>
  )
}
