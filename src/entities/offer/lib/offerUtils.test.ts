import { describe, it, expect } from "bun:test";
import {
  validateOfferString,
  isOfferActiveState,
  isOfferFinalizedState,
  canCancelOffer,
  canUploadToDexie,
  getDexieStatusDescription,
} from "./offerUtils";
import type { OfferState } from "../types";

describe("validateOfferString", () => {
  it("should reject empty string", () => {
    expect(validateOfferString("")).toBe(false);
  });

  it("should reject whitespace-only string", () => {
    expect(validateOfferString("   ")).toBe(false);
  });

  it("should reject strings shorter than 50 characters", () => {
    expect(validateOfferString("offer123abc")).toBe(false);
  });

  it("should accept strings starting with 'offer' that are long enough", () => {
    const longOffer = `offer${  "a".repeat(60)}`;
    expect(validateOfferString(longOffer)).toBe(true);
  });

  it("should accept valid base64 strings of sufficient length", () => {
    const base64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/==";
    expect(validateOfferString(base64)).toBe(true);
  });
});

describe("isOfferActiveState", () => {
  it("should return true for Open state", () => {
    expect(isOfferActiveState("Open")).toBe(true);
  });

  it("should return true for Pending state", () => {
    expect(isOfferActiveState("Pending")).toBe(true);
  });

  it("should return false for finalized states", () => {
    const finalizedStates: OfferState[] = ["Completed", "Cancelled", "Expired", "Unknown", "Cancelling"];
    for (const state of finalizedStates) {
      expect(isOfferActiveState(state)).toBe(false);
    }
  });
});

describe("isOfferFinalizedState", () => {
  it("should return true for Completed", () => {
    expect(isOfferFinalizedState("Completed")).toBe(true);
  });

  it("should return true for Cancelled", () => {
    expect(isOfferFinalizedState("Cancelled")).toBe(true);
  });

  it("should return true for Expired", () => {
    expect(isOfferFinalizedState("Expired")).toBe(true);
  });

  it("should return false for active states", () => {
    expect(isOfferFinalizedState("Open")).toBe(false);
    expect(isOfferFinalizedState("Pending")).toBe(false);
  });

  it("should return false for Unknown/Cancelling", () => {
    expect(isOfferFinalizedState("Unknown")).toBe(false);
    expect(isOfferFinalizedState("Cancelling")).toBe(false);
  });
});

describe("canCancelOffer", () => {
  it("should return true for Open state", () => {
    expect(canCancelOffer("Open")).toBe(true);
  });

  it("should return true for Pending state", () => {
    expect(canCancelOffer("Pending")).toBe(true);
  });

  it("should return false for Cancelled state", () => {
    expect(canCancelOffer("Cancelled")).toBe(false);
  });

  it("should return false for Completed state", () => {
    expect(canCancelOffer("Completed")).toBe(false);
  });

  it("should return false for Expired state", () => {
    expect(canCancelOffer("Expired")).toBe(false);
  });

  it("should handle OfferStatus values via conversion", () => {
    expect(canCancelOffer("active")).toBe(true);
    expect(canCancelOffer("pending")).toBe(true);
    expect(canCancelOffer("completed")).toBe(false);
    expect(canCancelOffer("cancelled")).toBe(false);
  });
});

describe("canUploadToDexie", () => {
  it("should return false for null", () => {
    expect(canUploadToDexie(null)).toBe(false);
  });

  it("should return false for undefined", () => {
    expect(canUploadToDexie(undefined)).toBe(false);
  });

  it("should return false for empty string", () => {
    expect(canUploadToDexie("")).toBe(false);
  });

  it("should return true for valid offer string", () => {
    const validOffer = `offer${  "x".repeat(60)}`;
    expect(canUploadToDexie(validOffer)).toBe(true);
  });
});

describe("getDexieStatusDescription", () => {
  const numericCases: [number, string][] = [
    [0, "Open"],
    [1, "Pending"],
    [2, "Cancelling"],
    [3, "Cancelled"],
    [4, "Completed"],
    [5, "Unknown"],
    [6, "Expired"],
    [99, "Unknown"],
  ];

  for (const [status, expected] of numericCases) {
    it(`should map status ${status} → ${expected}`, () => {
      expect(getDexieStatusDescription(status)).toBe(expected);
    });
  }

  it("should return string as-is when it is a valid OfferState", () => {
    expect(getDexieStatusDescription("Open")).toBe("Open");
    expect(getDexieStatusDescription("Completed")).toBe("Completed");
    expect(getDexieStatusDescription("Expired")).toBe("Expired");
  });
});
