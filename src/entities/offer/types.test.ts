import { describe, it, expect } from "bun:test";
import {
  convertOfferStateToStatus,
  convertStatusToOfferState,
  getOfferStateDisplayText,
  getOfferStateClass,
  calculateOfferState,
  type OfferState,
  type OfferStatus,
  type DexieOffer,
} from "./types";

// Helper to create a minimal DexieOffer
function makeOffer(overrides: Partial<DexieOffer> = {}): DexieOffer {
  return {
    id: "offer-1",
    status: 0,
    date_found: new Date().toISOString(),
    date_completed: null,
    date_pending: null,
    date_expiry: null,
    block_expiry: null,
    spent_block_index: null,
    price: 1,
    offered: [],
    requested: [],
    fees: 0,
    known_taker: null,
    ...overrides,
  };
}

describe("convertOfferStateToStatus", () => {
  const cases: [OfferState, OfferStatus][] = [
    ["Open", "active"],
    ["Pending", "pending"],
    ["Cancelling", "pending"],
    ["Cancelled", "cancelled"],
    ["Completed", "completed"],
    ["Expired", "expired"],
    ["Unknown", "failed"],
  ];

  for (const [state, expectedStatus] of cases) {
    it(`should map ${state} → ${expectedStatus}`, () => {
      expect(convertOfferStateToStatus(state)).toBe(expectedStatus);
    });
  }
});

describe("convertStatusToOfferState", () => {
  const cases: [OfferStatus, OfferState][] = [
    ["active", "Open"],
    ["pending", "Pending"],
    ["cancelled", "Cancelled"],
    ["completed", "Completed"],
    ["expired", "Expired"],
    ["failed", "Unknown"],
  ];

  for (const [status, expectedState] of cases) {
    it(`should map ${status} → ${expectedState}`, () => {
      expect(convertStatusToOfferState(status)).toBe(expectedState);
    });
  }
});

describe("getOfferStateDisplayText", () => {
  const states: OfferState[] = [
    "Open",
    "Pending",
    "Cancelling",
    "Cancelled",
    "Completed",
    "Expired",
    "Unknown",
  ];

  for (const state of states) {
    it(`should return display text for ${state}`, () => {
      expect(getOfferStateDisplayText(state)).toBe(state);
    });
  }
});

describe("getOfferStateClass", () => {
  it("should return kebab-cased CSS classes", () => {
    expect(getOfferStateClass("Open")).toBe("offer-state-open");
    expect(getOfferStateClass("Cancelled")).toBe("offer-state-cancelled");
    expect(getOfferStateClass("Completed")).toBe("offer-state-completed");
    expect(getOfferStateClass("Expired")).toBe("offer-state-expired");
    expect(getOfferStateClass("Unknown")).toBe("offer-state-unknown");
  });
});

describe("calculateOfferState", () => {
  it("should return Cancelled when spent_block_index is set (highest priority)", () => {
    const offer = makeOffer({
      spent_block_index: 1234567,
      date_completed: new Date().toISOString(),
      known_taker: "someone",
    });
    expect(calculateOfferState(offer)).toBe("Cancelled");
  });

  it("should return Completed when date_completed is set", () => {
    const offer = makeOffer({
      date_completed: new Date().toISOString(),
      known_taker: "taker-fingerprint",
    });
    expect(calculateOfferState(offer)).toBe("Completed");
  });

  it("should return Pending when date_pending is set and not cancelled/completed", () => {
    const offer = makeOffer({ date_pending: new Date().toISOString() });
    expect(calculateOfferState(offer)).toBe("Pending");
  });

  it("should return Expired when date_expiry is in the past", () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
    const offer = makeOffer({ date_expiry: pastDate });
    expect(calculateOfferState(offer)).toBe("Expired");
  });

  it("should return Expired when block_expiry has been reached", () => {
    const offer = makeOffer({ block_expiry: 100 });
    expect(calculateOfferState(offer, 200)).toBe("Expired");
  });

  it("should return Open when date_found exists with no other conditions", () => {
    const offer = makeOffer({ date_found: new Date().toISOString() });
    expect(calculateOfferState(offer)).toBe("Open");
  });

  it("should return Unknown when all dates are null", () => {
    const offer = makeOffer({ date_found: "" });
    expect(calculateOfferState(offer)).toBe("Unknown");
  });

  it("should return Open for a future expiry date", () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString(); // 1 day ahead
    const offer = makeOffer({ date_expiry: futureDate });
    expect(calculateOfferState(offer)).toBe("Open");
  });

  it("Cancelled takes priority over Completed", () => {
    const offer = makeOffer({
      spent_block_index: 999,
      date_completed: new Date().toISOString(),
    });
    expect(calculateOfferState(offer)).toBe("Cancelled");
  });
});
