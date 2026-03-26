"use client";

import {
  convertToSmallestUnit,
  getMinimumFeeInXch,
  isValidChiaAddress,
  xchToMojos,
} from "@/shared/lib/utils/chia-units";
import type { AssetType } from "@/entities/offer";
import { useMemo, useState } from "react";

interface UseTransactionFormProps {
  availableBalance: number;
  assetId?: string;
  ticker?: string;
  isXch?: boolean;
}

export function useTransactionForm({
  availableBalance,
  assetId,
  ticker = "XCH",
  isXch = true,
}: UseTransactionFormProps) {
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [fee, setFee] = useState("0.000001");
  const [memo, setMemo] = useState("");
  const [addressError, setAddressError] = useState("");
  const [amountError, setAmountError] = useState("");
  const [feeError, setFeeError] = useState("");

  const assetType: AssetType = isXch ? "xch" : "cat";

  const validateAddress = () => {
    const trimmed = recipientAddress.trim();
    if (!trimmed) {
      setAddressError("");
      return false;
    }
    if (!isValidChiaAddress(trimmed)) {
      setAddressError("Invalid Chia address format");
      return false;
    }
    setAddressError("");
    return true;
  };

  const validateAmount = () => {
    const amountNum = parseFloat(amount);

    if (!amount || amountNum <= 0) {
      setAmountError("Amount must be greater than 0");
      return false;
    }

    if (isXch) {
      const feeNum = parseFloat(fee || "0");
      const total = amountNum + feeNum;
      if (total > availableBalance) {
        setAmountError(
          `Insufficient balance. Total (${total.toFixed(6)}) exceeds available (${availableBalance.toFixed(6)} ${ticker})`
        );
        return false;
      }
    } else {
      if (amountNum > availableBalance) {
        setAmountError(
          `Insufficient balance. ${amountNum} exceeds available ${availableBalance} ${ticker}`
        );
        return false;
      }
    }

    setAmountError("");
    return true;
  };

  const validateFee = () => {
    const feeNum = parseFloat(fee || "0");
    const minFee = getMinimumFeeInXch();

    if (!fee || feeNum <= 0) {
      setFeeError("Fee must be greater than 0");
      return false;
    }

    if (feeNum < minFee) {
      setFeeError(`Minimum fee is ${minFee} XCH`);
      return false;
    }

    setFeeError("");
    return true;
  };

  const isFormValid = useMemo(() => {
    return (
      recipientAddress.trim() &&
      amount &&
      fee &&
      !addressError &&
      !amountError &&
      !feeError &&
      parseFloat(amount) > 0 &&
      parseFloat(fee) > 0
    );
  }, [recipientAddress, amount, fee, addressError, amountError, feeError]);

  const resetForm = () => {
    setRecipientAddress("");
    setAmount("");
    setFee("0.000001");
    setMemo("");
    setAddressError("");
    setAmountError("");
    setFeeError("");
  };

  const getTransactionParams = () => {
    return {
      walletId: 1,
      address: recipientAddress.trim(),
      amount: convertToSmallestUnit(parseFloat(amount), assetType),
      fee: xchToMojos(parseFloat(fee)),
      memos: memo.trim() ? [memo.trim()] : undefined,
      ...(!isXch && assetId ? { assetId } : {}),
    };
  };

  return {
    recipientAddress,
    setRecipientAddress,
    amount,
    setAmount,
    fee,
    setFee,
    memo,
    setMemo,
    addressError,
    amountError,
    feeError,
    validateAddress,
    validateAmount,
    validateFee,
    isFormValid,
    resetForm,
    getTransactionParams,
    assetType,
  };
}
