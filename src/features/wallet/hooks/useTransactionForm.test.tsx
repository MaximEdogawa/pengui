import { describe, it, expect, afterEach } from "bun:test";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useTransactionForm } from "./useTransactionForm";
import { AllTheProviders } from "@/test-utils";

const VALID_ADDRESS = `xch1${  "a".repeat(58)}`;
const VALID_TXCH_ADDRESS = `txch1${  "a".repeat(58)}`;

afterEach(() => {
  cleanup();
});

describe("useTransactionForm - initial state", () => {
  it("should have empty fields and default fee on init", () => {
    const { result } = renderHook(
      () => useTransactionForm({ availableBalance: 10, isXch: true }),
      { wrapper: AllTheProviders }
    );

    expect(result.current.recipientAddress).toBe("");
    expect(result.current.amount).toBe("");
    expect(result.current.fee).toBe("0.000001");
    expect(result.current.memo).toBe("");
    expect(result.current.addressError).toBe("");
    expect(result.current.amountError).toBe("");
    expect(result.current.feeError).toBe("");
  });

  it("should detect xch assetType when isXch=true", () => {
    const { result } = renderHook(
      () => useTransactionForm({ availableBalance: 10, isXch: true }),
      { wrapper: AllTheProviders }
    );
    expect(result.current.assetType).toBe("xch");
  });

  it("should detect cat assetType when isXch=false", () => {
    const { result } = renderHook(
      () =>
        useTransactionForm({
          availableBalance: 100,
          isXch: false,
          assetId: "cat-id",
          ticker: "SBX",
        }),
      { wrapper: AllTheProviders }
    );
    expect(result.current.assetType).toBe("cat");
  });
});

describe("useTransactionForm - validateAddress", () => {
  it("should return false and clear error for empty address", () => {
    const { result } = renderHook(
      () => useTransactionForm({ availableBalance: 10 }),
      { wrapper: AllTheProviders }
    );

    let valid: boolean;
    act(() => {
      valid = result.current.validateAddress();
    });
    expect(valid!).toBe(false);
    expect(result.current.addressError).toBe("");
  });

  it("should return false and set error for invalid address", () => {
    const { result } = renderHook(
      () => useTransactionForm({ availableBalance: 10 }),
      { wrapper: AllTheProviders }
    );

    act(() => {
      result.current.setRecipientAddress("invalid-address");
    });
    let valid: boolean;
    act(() => {
      valid = result.current.validateAddress();
    });
    expect(valid!).toBe(false);
    expect(result.current.addressError).toBe("Invalid Chia address format");
  });

  it("should return true and clear error for valid mainnet address", () => {
    const { result } = renderHook(
      () => useTransactionForm({ availableBalance: 10 }),
      { wrapper: AllTheProviders }
    );

    act(() => {
      result.current.setRecipientAddress(VALID_ADDRESS);
    });
    let valid: boolean;
    act(() => {
      valid = result.current.validateAddress();
    });
    expect(valid!).toBe(true);
    expect(result.current.addressError).toBe("");
  });

  it("should accept testnet addresses", () => {
    const { result } = renderHook(
      () => useTransactionForm({ availableBalance: 10 }),
      { wrapper: AllTheProviders }
    );

    act(() => {
      result.current.setRecipientAddress(VALID_TXCH_ADDRESS);
    });
    let valid: boolean;
    act(() => {
      valid = result.current.validateAddress();
    });
    expect(valid!).toBe(true);
  });
});

describe("useTransactionForm - validateAmount", () => {
  it("should return false for empty amount", () => {
    const { result } = renderHook(
      () => useTransactionForm({ availableBalance: 10 }),
      { wrapper: AllTheProviders }
    );

    let valid: boolean;
    act(() => {
      valid = result.current.validateAmount();
    });
    expect(valid!).toBe(false);
    expect(result.current.amountError).toContain("greater than 0");
  });

  it("should return false for zero amount", () => {
    const { result } = renderHook(
      () => useTransactionForm({ availableBalance: 10 }),
      { wrapper: AllTheProviders }
    );

    act(() => { result.current.setAmount("0"); });
    let valid: boolean;
    act(() => { valid = result.current.validateAmount(); });
    expect(valid!).toBe(false);
  });

  it("should return false when XCH amount + fee exceeds balance", () => {
    const { result } = renderHook(
      () => useTransactionForm({ availableBalance: 1, isXch: true }),
      { wrapper: AllTheProviders }
    );

    act(() => {
      result.current.setAmount("1"); // 1 XCH + 0.000001 fee > 1 XCH balance
    });
    let valid: boolean;
    act(() => { valid = result.current.validateAmount(); });
    expect(valid!).toBe(false);
    expect(result.current.amountError).toContain("Insufficient balance");
  });

  it("should return true when amount is within balance", () => {
    const { result } = renderHook(
      () => useTransactionForm({ availableBalance: 10, isXch: true }),
      { wrapper: AllTheProviders }
    );

    act(() => { result.current.setAmount("5"); });
    let valid: boolean;
    act(() => { valid = result.current.validateAmount(); });
    expect(valid!).toBe(true);
    expect(result.current.amountError).toBe("");
  });

  it("should return false when CAT amount exceeds balance", () => {
    const { result } = renderHook(
      () =>
        useTransactionForm({
          availableBalance: 100,
          isXch: false,
          assetId: "cat-id",
          ticker: "SBX",
        }),
      { wrapper: AllTheProviders }
    );

    act(() => { result.current.setAmount("200"); });
    let valid: boolean;
    act(() => { valid = result.current.validateAmount(); });
    expect(valid!).toBe(false);
    expect(result.current.amountError).toContain("Insufficient balance");
  });
});

describe("useTransactionForm - validateFee", () => {
  it("should return false for empty fee", () => {
    const { result } = renderHook(
      () => useTransactionForm({ availableBalance: 10 }),
      { wrapper: AllTheProviders }
    );

    act(() => { result.current.setFee(""); });
    let valid: boolean;
    act(() => { valid = result.current.validateFee(); });
    expect(valid!).toBe(false);
    expect(result.current.feeError).toContain("greater than 0");
  });

  it("should return false for fee below minimum", () => {
    const { result } = renderHook(
      () => useTransactionForm({ availableBalance: 10 }),
      { wrapper: AllTheProviders }
    );

    act(() => { result.current.setFee("0.0000001"); }); // below 0.000001 minimum
    let valid: boolean;
    act(() => { valid = result.current.validateFee(); });
    expect(valid!).toBe(false);
    expect(result.current.feeError).toContain("Minimum fee");
  });

  it("should return true for valid fee at minimum", () => {
    const { result } = renderHook(
      () => useTransactionForm({ availableBalance: 10 }),
      { wrapper: AllTheProviders }
    );

    // Default fee is already "0.000001"
    let valid: boolean;
    act(() => { valid = result.current.validateFee(); });
    expect(valid!).toBe(true);
    expect(result.current.feeError).toBe("");
  });
});

describe("useTransactionForm - resetForm", () => {
  it("should reset all fields to initial state", () => {
    const { result } = renderHook(
      () => useTransactionForm({ availableBalance: 10 }),
      { wrapper: AllTheProviders }
    );

    act(() => {
      result.current.setRecipientAddress(VALID_ADDRESS);
      result.current.setAmount("5");
      result.current.setMemo("test memo");
      result.current.setFee("0.001");
    });

    act(() => { result.current.resetForm(); });

    expect(result.current.recipientAddress).toBe("");
    expect(result.current.amount).toBe("");
    expect(result.current.fee).toBe("0.000001");
    expect(result.current.memo).toBe("");
  });
});

describe("useTransactionForm - isFormValid", () => {
  it("should be falsy when form is empty", () => {
    const { result } = renderHook(
      () => useTransactionForm({ availableBalance: 10 }),
      { wrapper: AllTheProviders }
    );
    expect(result.current.isFormValid).toBeFalsy();
  });

  it("should be truthy when address, amount, and fee are valid", () => {
    const { result } = renderHook(
      () => useTransactionForm({ availableBalance: 10 }),
      { wrapper: AllTheProviders }
    );

    act(() => {
      result.current.setRecipientAddress(VALID_ADDRESS);
      result.current.setAmount("1");
    });

    expect(result.current.isFormValid).toBeTruthy();
  });
});
