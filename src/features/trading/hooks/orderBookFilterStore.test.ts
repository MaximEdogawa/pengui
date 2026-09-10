import { describe, it, expect, beforeEach } from "bun:test";
import { useOrderBookFilterStore } from "./orderBookFilterStore";
import type { SuggestionItem } from "../lib/orderBookTypes";

const suggestion = (overrides: Partial<SuggestionItem> = {}): SuggestionItem => ({
  value: "XCH",
  column: "buyAsset",
  label: "XCH",
  type: "single",
  sublabel: "Chia",
  ...overrides,
});

describe("orderBookFilterStore - setFilteredSuggestions", () => {
  beforeEach(() => {
    useOrderBookFilterStore.setState({ filteredSuggestions: [] });
  });

  it("stores a new suggestion list", () => {
    const suggestions = [suggestion()];
    useOrderBookFilterStore.getState().setFilteredSuggestions(suggestions);

    expect(useOrderBookFilterStore.getState().filteredSuggestions).toBe(suggestions);
  });

  it("keeps the existing reference when the new list has equal content", () => {
    const { setFilteredSuggestions } = useOrderBookFilterStore.getState();
    setFilteredSuggestions([suggestion()]);
    const stored = useOrderBookFilterStore.getState().filteredSuggestions;

    // A fresh array with identical content - what the suggestion effect produces on
    // every run. Writing it would re-render subscribers and can spin into an
    // infinite update loop (React error #185).
    setFilteredSuggestions([suggestion()]);

    expect(useOrderBookFilterStore.getState().filteredSuggestions).toBe(stored);
  });

  it("keeps the existing reference for an equal pair suggestion list", () => {
    const pair = suggestion({
      value: "XCH/BYC",
      label: "XCH/BYC",
      type: "pair",
      pairBuyAsset: "XCH",
      pairSellAsset: "BYC",
      sublabel: "Recent pair",
    });
    const { setFilteredSuggestions } = useOrderBookFilterStore.getState();
    setFilteredSuggestions([pair]);
    const stored = useOrderBookFilterStore.getState().filteredSuggestions;

    setFilteredSuggestions([{ ...pair }]);

    expect(useOrderBookFilterStore.getState().filteredSuggestions).toBe(stored);
  });

  it("updates when a field of a suggestion changes", () => {
    const { setFilteredSuggestions } = useOrderBookFilterStore.getState();
    setFilteredSuggestions([suggestion()]);
    const stored = useOrderBookFilterStore.getState().filteredSuggestions;

    setFilteredSuggestions([suggestion({ sublabel: "Top volume pair" })]);

    expect(useOrderBookFilterStore.getState().filteredSuggestions).not.toBe(stored);
    expect(useOrderBookFilterStore.getState().filteredSuggestions[0].sublabel).toBe(
      "Top volume pair"
    );
  });

  it("updates when the list length changes", () => {
    const { setFilteredSuggestions } = useOrderBookFilterStore.getState();
    setFilteredSuggestions([suggestion()]);

    setFilteredSuggestions([suggestion(), suggestion({ value: "BYC", label: "BYC" })]);

    expect(useOrderBookFilterStore.getState().filteredSuggestions).toHaveLength(2);
  });
});
