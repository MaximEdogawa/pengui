import { describe, it, expect } from "bun:test";
import { formatTransactionAddress, formatTransactionAmount } from "./transaction-formatters";
import type { Transaction } from "./types";

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "tx-1",
    transactionId: "chain-tx-id",
    timestamp: Date.now(),
    type: "send",
    amount: "1000000000000", // 1 XCH in mojos
    fee: "1000000",
    recipientAddress: `xch1${"a".repeat(58)}`,
    status: "confirmed",
    ...overrides,
  };
}

describe("formatTransactionAddress", () => {
  it("should format long recipient address with ellipsis", () => {
    const tx = makeTransaction({ recipientAddress: `xch1${"a".repeat(58)}` });
    const result = formatTransactionAddress(tx);
    expect(result).toContain("...");
    expect(result.length).toBeLessThan(20);
  });

  it("should fall back to senderAddress when recipientAddress is missing", () => {
    const tx = makeTransaction({
      recipientAddress: undefined,
      senderAddress: `xch1${"b".repeat(58)}`,
    });
    const result = formatTransactionAddress(tx);
    expect(result).toContain("...");
    expect(result).toContain("xch1");
  });

  it("should return empty string when both addresses are missing", () => {
    const tx = makeTransaction({ recipientAddress: undefined, senderAddress: undefined });
    const result = formatTransactionAddress(tx);
    expect(result).toBe("");
  });

  it("should return short addresses unchanged", () => {
    const tx = makeTransaction({ recipientAddress: "short" });
    const result = formatTransactionAddress(tx);
    expect(result).toBe("short");
  });
});

describe("formatTransactionAmount", () => {
  it("should format mojos as XCH with 6 decimal places", () => {
    const tx = makeTransaction({ amount: "1000000000000" }); // 1 XCH
    expect(formatTransactionAmount(tx)).toBe("1.000000");
  });

  it("should format fractional XCH correctly", () => {
    const tx = makeTransaction({ amount: "500000000000" }); // 0.5 XCH
    expect(formatTransactionAmount(tx)).toBe("0.500000");
  });

  it("should handle zero amount", () => {
    const tx = makeTransaction({ amount: "0" });
    expect(formatTransactionAmount(tx)).toBe("0.000000");
  });

  it("should return default on invalid amount", () => {
    const tx = makeTransaction({ amount: "invalid" });
    expect(formatTransactionAmount(tx)).toBe("0.000000");
  });
});
