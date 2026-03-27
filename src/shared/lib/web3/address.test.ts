import { describe, it, expect } from "bun:test";
import { formatAddress } from "./address";

describe("formatAddress", () => {
  it("should return empty string for falsy input", () => {
    expect(formatAddress("")).toBe("");
  });

  it("should return short addresses unchanged (≤ startChars + endChars)", () => {
    expect(formatAddress("short")).toBe("short");
    expect(formatAddress("xch1ab")).toBe("xch1ab");
  });

  it("should truncate long addresses with ellipsis", () => {
    const addr = `xch1${  "a".repeat(58)}`;
    const result = formatAddress(addr);
    expect(result).toContain("...");
    expect(result.startsWith("xch1aa")).toBe(true); // first 6 chars
    expect(result.endsWith("aaaa")).toBe(true); // last 4 chars
  });

  it("should use default startChars=6 and endChars=4", () => {
    const addr = "abcdefghijklmnop"; // 16 chars
    const result = formatAddress(addr);
    expect(result).toBe("abcdef...mnop");
  });

  it("should respect custom startChars", () => {
    const addr = "abcdefghijklmnop";
    const result = formatAddress(addr, 4, 4);
    expect(result).toBe("abcd...mnop");
  });

  it("should respect custom endChars", () => {
    const addr = "abcdefghijklmnop";
    const result = formatAddress(addr, 6, 2);
    expect(result).toBe("abcdef...op");
  });

  it("should return address unchanged when exactly at boundary", () => {
    const addr = "abcdefghij"; // exactly 6 + 4 = 10 chars
    expect(formatAddress(addr)).toBe("abcdefghij");
  });

  it("should truncate address just over the boundary", () => {
    const addr = "abcdefghijk"; // 11 chars, just over 10
    const result = formatAddress(addr);
    expect(result).toBe("abcdef...hijk");
  });
});
