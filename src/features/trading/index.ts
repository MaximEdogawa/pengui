/**
 * Trading Feature
 * Exports for the trading feature
 */

// Model exports
export { useOrderBook } from './model/useOrderBook'
export { useOrderBookFilters, OrderBookFiltersProvider } from './model/OrderBookFiltersProvider'
export { useOrderBookOfferSubmission } from './model/useOrderBookOfferSubmission'

// UI exports
export { default as OrderBookContainer } from './ui/orderbook/OrderBookContainer'
export { default as OrderBookTable } from './ui/orderbook/OrderBookTable'
export { default as OrderBookFilters } from './ui/orderbook/OrderBookFilters'
export { default as OrderTooltip } from './ui/orderbook/OrderTooltip'
export { default as TradingLayout } from './ui/layout/TradingLayout'
export { default as TradingContent } from './ui/layout/TradingContent'
export { default as FilterPanel } from './ui/layout/FilterPanel'
export { default as LimitOfferTab } from './ui/layout/LimitOfferTab'
export { default as CreateOfferModal } from './ui/modals/CreateOfferModal'
export { default as CreateOfferForm } from './ui/make-offer/CreateOfferForm'
export { default as TakeOfferModal } from './ui/modals/TakeOfferModal'

// Type exports
export type {
  OrderBookOrder,
  OrderBookFilters as OrderBookFiltersType,
  OrderBookQueryResult,
  SuggestionItem,
  DexieAssetItem,
} from './lib/orderBookTypes'
