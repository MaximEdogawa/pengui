/**
 * Trading Feature
 * Exports for the trading feature
 */

// Model exports
export { useOrderBook } from "./hooks/useOrderBook";
export { useOrderBookFilters, OrderBookFiltersProvider } from "./hooks/OrderBookFiltersProvider";
export { useOrderBookOfferSubmission } from "./hooks/useOrderBookOfferSubmission";

// UI exports
export { default as OrderBookContainer } from "./ui/widgets/orderbook/OrderBookContainer";
export { default as OrderBookTable } from "./ui/widgets/orderbook/OrderBookTable";
export { default as OrderBookFilters } from "./ui/widgets/orderbook/OrderBookFilters";
export { default as OrderTooltip } from "./ui/widgets/orderbook/OrderTooltip";
export { default as CreateOfferModal } from "./ui/componets/offer/CreateOfferDialog";
export { default as CreateOfferForm } from "./ui/componets/limit/CreateOfferForm";
export { default as TakeOfferModal } from "./ui/componets/offer/TakeOfferDialog";

// Chart feature exports
export * from "./ui/widgets/chart";

// Type exports
export type {
  OrderBookOrder,
  OrderBookFilters as OrderBookFiltersType,
  OrderBookQueryResult,
  SuggestionItem,
  DexieAssetItem,
} from "./lib/orderBookTypes";
