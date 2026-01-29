'use client'

import { getMinimumFeeInXch, isValidChiaAddress, xchToMojos } from '@/shared/lib/utils/chia-units'
import { useMemo, useState } from 'react'

interface UseTransactionFormProps {
  availableBalance: number
}

export function useTransactionForm({ availableBalance }: UseTransactionFormProps) {
  const [recipientAddress, setRecipientAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [fee, setFee] = useState('0.000001')
  const [memo, setMemo] = useState('')
  const [addressError, setAddressError] = useState('')
  const [amountError, setAmountError] = useState('')
  const [feeError, setFeeError] = useState('')

  const validateAddress = () => {
    const trimmed = recipientAddress.trim()
    if (!trimmed) {
      setAddressError('')
      return false
    }
    if (!isValidChiaAddress(trimmed)) {
      setAddressError('Invalid Chia address format')
      return false
    }
    setAddressError('')
    return true
  }

  const validateAmount = () => {
    const amountNum = parseFloat(amount)
    const feeNum = parseFloat(fee || '0')
    const total = amountNum + feeNum

    if (!amount || amountNum <= 0) {
      setAmountError('Amount must be greater than 0')
      return false
    }

    if (total > availableBalance) {
      setAmountError(
        `Insufficient balance. Total (${total.toFixed(6)}) exceeds available (${availableBalance.toFixed(6)} XCH)`
      )
      return false
    }

    setAmountError('')
    return true
  }

  const validateFee = () => {
    const feeNum = parseFloat(fee || '0')
    const minFee = getMinimumFeeInXch()

    if (!fee || feeNum <= 0) {
      setFeeError('Fee must be greater than 0')
      return false
    }

    if (feeNum < minFee) {
      setFeeError(`Minimum fee is ${minFee} XCH`)
      return false
    }

    setFeeError('')
    return true
  }

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
    )
  }, [recipientAddress, amount, fee, addressError, amountError, feeError])

  const resetForm = () => {
    setRecipientAddress('')
    setAmount('')
    setFee('0.000001')
    setMemo('')
    setAddressError('')
    setAmountError('')
    setFeeError('')
  }

  const getTransactionParams = () => {
    return {
      walletId: 1,
      address: recipientAddress.trim(),
      amount: xchToMojos(parseFloat(amount)),
      fee: xchToMojos(parseFloat(fee)),
      memos: memo.trim() ? [memo.trim()] : undefined,
    }
  }

  return {
    // Form values
    recipientAddress,
    setRecipientAddress,
    amount,
    setAmount,
    fee,
    setFee,
    memo,
    setMemo,
    // Errors
    addressError,
    amountError,
    feeError,
    // Validation
    validateAddress,
    validateAmount,
    validateFee,
    isFormValid,
    // Utilities
    resetForm,
    getTransactionParams,
  }
}
