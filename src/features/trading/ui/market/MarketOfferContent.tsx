'use client'

import { type OfferDetails } from '@/entities/offer'
import { useOfferInspection } from '@/features/offers/model/useOfferInspection'
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
  })

  const containerClass = mode === 'modal' ? 'space-y-4' : 'space-y-3'

  return (
    <div className={containerClass}>
      <form onSubmit={handleSubmit} className={containerClass}>
        <MarketOfferFormInputs
          order={order}
          offerString={formState.offerString}
          setOfferString={formState.setOfferString}
          fee={formState.fee}
          feeInput={formState.feeInput}
          handleFeeChange={formState.handleFeeChange}
          handleFeeBlur={formState.handleFeeBlur}
          isSubmitting={formState.isSubmitting}
        />

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

        <MarketOfferActions
          mode={mode}
          onClose={onClose}
          isFormValid={isFormValid}
          isSubmitting={formState.isSubmitting}
          orderType={orderType}
        />

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
