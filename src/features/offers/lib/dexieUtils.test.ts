import { describe, it, expect } from "bun:test";
import { isOfferCompleted, isOfferCancelled, isOfferActive, isOfferFinalized } from "./dexieUtils";
import type { OfferState } from "@/entities/offer";

const ALL_STATES: OfferState[] = [
  "Open",
  "Pending",
  "Cancelling",
  "Cancelled",
  "Completed",
  "Expired",
  "Unknown",
];

describe("isOfferCompleted", () => {
  it("should return true only for Completed", () => {
    expect(isOfferCompleted("Completed")).toBe(true);
  });

  it("should return false for all other states", () => {
    for (const state of ALL_STATES.filter((s) => s !== "Completed")) {
      expect(isOfferCompleted(state)).toBe(false);
    }
  });
});

describe("isOfferCancelled", () => {
  it("should return true only for Cancelled", () => {
    expect(isOfferCancelled("Cancelled")).toBe(true);
  });

  it("should return false for all other states", () => {
    for (const state of ALL_STATES.filter((s) => s !== "Cancelled")) {
      expect(isOfferCancelled(state)).toBe(false);
    }
  });
});

describe("isOfferActive", () => {
  it("should return true for Open", () => {
    expect(isOfferActive("Open")).toBe(true);
  });

  it("should return true for Pending", () => {
    expect(isOfferActive("Pending")).toBe(true);
  });

  it("should return false for all finalized and unknown states", () => {
    const inactiveStates: OfferState[] = [
      "Cancelling",
      "Cancelled",
      "Completed",
      "Expired",
      "Unknown",
    ];
    for (const state of inactiveStates) {
      expect(isOfferActive(state)).toBe(false);
    }
  });
});

describe("isOfferFinalized", () => {
  it("should return true for Completed, Cancelled, and Expired", () => {
    expect(isOfferFinalized("Completed")).toBe(true);
    expect(isOfferFinalized("Cancelled")).toBe(true);
    expect(isOfferFinalized("Expired")).toBe(true);
  });

  it("should return false for non-finalized states", () => {
    const nonFinalizedStates: OfferState[] = ["Open", "Pending", "Cancelling", "Unknown"];
    for (const state of nonFinalizedStates) {
      expect(isOfferFinalized(state)).toBe(false);
    }
  });
});
