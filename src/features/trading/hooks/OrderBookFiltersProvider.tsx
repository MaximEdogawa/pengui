"use client";

import { createContext, useContext, ReactNode } from "react";
import { useOrderBookFilters as useOrderBookFiltersImpl } from "./useOrderBookFilters";

/**
 * Everything the filters hook exposes.
 *
 * The hook is not a passive reader - it owns the effects that apply network
 * defaults, invalidate queries and write `filteredSuggestions`. Every component
 * that calls the implementation directly gets its own copy of those effects
 * writing to the same store, which is how the "maximum update depth exceeded"
 * loop gets fed. Consumers must go through this context so exactly one instance
 * runs per page.
 */
type OrderBookFiltersContextValue = ReturnType<typeof useOrderBookFiltersImpl>;

const OrderBookFiltersContext = createContext<OrderBookFiltersContextValue | undefined>(undefined);

export function OrderBookFiltersProvider({ children }: { children: ReactNode }) {
  const filtersState = useOrderBookFiltersImpl();

  return (
    <OrderBookFiltersContext.Provider value={filtersState}>
      {children}
    </OrderBookFiltersContext.Provider>
  );
}

export function useOrderBookFilters() {
  const context = useContext(OrderBookFiltersContext);
  if (context === undefined) {
    throw new Error("useOrderBookFilters must be used within an OrderBookFiltersProvider");
  }
  return context;
}
