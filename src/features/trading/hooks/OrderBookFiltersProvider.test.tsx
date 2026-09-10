/**
 * Regression test for TASK-002: the filters hook owns effects that write to the
 * shared store (network defaults, query invalidation, suggestion list). Every
 * component that calls the implementation directly instead of this context gets
 * its own copy of those effects writing to the same store, which is what feeds
 * the "maximum update depth exceeded" loop. One provider must mean one instance,
 * however many consumers are mounted.
 */

import { describe, expect, it, afterEach, beforeEach } from "bun:test";
import React from "react";
import { render, cleanup, waitFor } from "@testing-library/react";
import { AllTheProviders } from "@/test-utils";
import { OrderBookFiltersProvider, useOrderBookFilters } from "./OrderBookFiltersProvider";
import { useOrderBookFilterStore } from "./orderBookFilterStore";

function Consumer() {
  const { filters } = useOrderBookFilters();
  return <span>{(filters.buyAsset ?? []).join(",")}</span>;
}

const initialState = useOrderBookFilterStore.getState();

/** Empty, hydrated store: the state in which the hook applies network defaults. */
function resetStore() {
  useOrderBookFilterStore.setState({
    ...initialState,
    filters: { buyAsset: [], sellAsset: [], status: [], pagination: 50 },
    searchValue: "",
    filteredSuggestions: [],
    recentPairs: [],
    savedNetwork: null,
    userClearedFilters: false,
    _hasHydrated: true,
  });
}

beforeEach(resetStore);

afterEach(() => cleanup());

/** Count store writes that land on `filters` while the tree mounts. */
async function countFilterWrites(children: React.ReactNode): Promise<number> {
  resetStore();
  let writes = 0;
  const unsubscribe = useOrderBookFilterStore.subscribe((state, prev) => {
    if (state.filters !== prev.filters) writes += 1;
  });
  try {
    render(
      <AllTheProviders>
        <OrderBookFiltersProvider>{children}</OrderBookFiltersProvider>
      </AllTheProviders>
    );
    await waitFor(() => expect(writes).toBeGreaterThan(0), { timeout: 5000 });
    // let any further instances land their own writes before counting
    await new Promise((resolve) => setTimeout(resolve, 200));
    return writes;
  } finally {
    unsubscribe();
  }
}

describe("OrderBookFiltersProvider", () => {
  it("runs the filter effects once regardless of how many consumers mount", async () => {
    const one = await countFilterWrites(<Consumer />);
    cleanup();

    const many = await countFilterWrites(
      <>
        <Consumer />
        <Consumer />
        <Consumer />
        <Consumer />
      </>
    );

    expect(many).toBe(one);
  });
});
