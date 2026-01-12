'use client'

import {
  assetInputAmounts,
  formatAssetAmountForInput,
  formatXchAmount,
  getAmountPlaceholder,
  getMinimumFeeInXch,
} from '@/shared/lib/utils/chia-units'
import { extractTransactionId } from '@/shared/lib/walletConnect/utils/transactionUtils'
import { ConnectButton, useWalletConnectionState } from '@maximedogawa/chia-wallet-connect-react'
import { useSendTransaction, useRefreshBalance, useTransactionForm } from '../model'
import { useThemeClasses } from '@/shared/hooks'
import { Send, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import TransactionStatus from './TransactionStatus'
import { logger } from '@/shared/lib/logger'
import { saveTransaction } from '@/shared/lib/walletConnect/utils/transactionStorage'
import FormInput from './shared/FormInput'

interface SendTransactionFormProps {
  availableBalance: number
}

export default function SendTransactionForm({ availableBalance }: SendTransactionFormProps) {
  const { isDark, t } = useThemeClasses()
  const { isConnected, address } = useWalletConnectionState()
  const sendTransactionMutation = useSendTransaction()
  const { refreshBalance } = useRefreshBalance()

  const {
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
  } = useTransactionForm({ availableBalance })

  // Local state for formatted inputs (undefined means use formatted value from hook)
  const [amountInput, setAmountInput] = useState<string | undefined>(undefined)
  const [feeInput, setFeeInput] = useState<string | undefined>(undefined)

  const [transactionStatus, setTransactionStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })

  const handleSendTransaction = async () => {
    setTransactionStatus({ type: null, message: '' })

    if (!validateAddress() || !validateAmount() || !validateFee()) {
      return
    }

    if (!isConnected) {
      setTransactionStatus({ type: 'error', message: 'Wallet not connected' })
      return
    }

    try {
      const params = getTransactionParams()
      const result = await sendTransactionMutation.mutateAsync(params)
      const transactionId = extractTransactionId(result)

      logger.info('Transaction result:', result)

      // Save transaction to local storage
      saveTransaction({
        transactionId: transactionId,
        type: 'send',
        amount: params.amount.toString(),
        fee: params.fee.toString(),
        recipientAddress: params.address,
        senderAddress: address || undefined,
        memo: params.memos?.[0],
        status: 'pending', // Will be updated when confirmed
      })

      setTransactionStatus({
        type: 'success',
        message: `Transaction sent successfully!${transactionId !== 'N/A' ? ` Transaction ID: ${transactionId}` : ''}`,
      })

      resetForm()

      // Trigger custom event to update RecentTransactions component
      window.dispatchEvent(new Event('transactionSaved'))

      // Refresh balance
      setTimeout(() => {
        refreshBalance()
      }, 2000)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred'
      setTransactionStatus({ type: 'error', message: `Transaction failed: ${errorMsg}` })
      logger.error('Transaction failed:', error)
    }
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-6">
        <p className={`${t.textSecondary} text-sm mb-4 text-center`}>
          Connect your wallet to send transactions
        </p>
        <ConnectButton />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <FormInput
        label="Recipient Address"
        type="text"
        value={recipientAddress}
        onChange={(e) => {
          setRecipientAddress(e.target.value)
          if (addressError) validateAddress()
        }}
        onBlur={validateAddress}
        placeholder="xch1..."
        error={addressError}
      />
      <FormInput
        label="Amount (XCH)"
        type="text"
        inputMode="decimal"
        pattern="[0-9]*\.?[0-9]*"
        value={
          amountInput !== undefined
            ? amountInput
            : amount && parseFloat(amount) > 0
              ? formatXchAmount(parseFloat(amount))
              : ''
        }
        onChange={(e) => {
          const inputValue = e.target.value
          if (assetInputAmounts.isValid(inputValue, 'xch')) {
            setAmountInput(inputValue)
            // Safely convert to number
            const parsed = assetInputAmounts.parse(inputValue, 'xch')
            setAmount(parsed > 0 ? parsed.toString() : '')
            if (amountError) validateAmount()
          }
        }}
        onBlur={() => {
          const inputValue = amountInput !== undefined ? amountInput : amount || ''
          // Safely convert to number
          const parsed = assetInputAmounts.parse(inputValue, 'xch')
          setAmount(parsed > 0 ? parsed.toString() : '')
          // Preserve input format if user typed something like "1.0"
          const formatted = formatAssetAmountForInput(parsed, 'xch')
          const shouldPreserveInput = inputValue.includes('.') && inputValue !== formatted
          setAmountInput(shouldPreserveInput ? inputValue : undefined)
          validateAmount()
        }}
        placeholder={getAmountPlaceholder('xch')}
        error={amountError}
        helperText={
          availableBalance > 0 ? (
            <span>Available: {formatXchAmount(availableBalance)} XCH</span>
          ) : undefined
        }
      />
      <FormInput
        label={
          <>
            Fee (XCH){' '}
            <span className="text-[10px]">(min: {formatXchAmount(getMinimumFeeInXch())})</span>
          </>
        }
        type="text"
        inputMode="decimal"
        pattern="[0-9]*\.?[0-9]*"
        value={
          feeInput !== undefined
            ? feeInput
            : fee && parseFloat(fee) > 0
              ? formatXchAmount(parseFloat(fee))
              : ''
        }
        onChange={(e) => {
          const inputValue = e.target.value
          if (assetInputAmounts.isValid(inputValue, 'xch')) {
            setFeeInput(inputValue)
            // Safely convert to number
            const parsed = assetInputAmounts.parse(inputValue, 'xch')
            setFee(parsed > 0 ? parsed.toString() : '')
            if (feeError) validateFee()
          }
        }}
        onBlur={() => {
          // Safely convert to number
          const parsed = assetInputAmounts.parse(
            feeInput !== undefined ? feeInput : fee || '',
            'xch'
          )
          setFee(parsed > 0 ? parsed.toString() : '')
          setFeeInput(undefined)
          validateFee()
        }}
        placeholder={getAmountPlaceholder('xch')}
        error={feeError}
      />
      <FormInput
        label="Memo (Optional)"
        type="text"
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="Optional memo"
      />
      <TransactionStatus type={transactionStatus.type} message={transactionStatus.message} />
      <button
        onClick={handleSendTransaction}
        disabled={!isFormValid || sendTransactionMutation.isPending}
        className={`w-full px-6 py-3 rounded-xl backdrop-blur-xl ${
          isFormValid && !sendTransactionMutation.isPending
            ? isDark
              ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 text-cyan-400 hover:from-cyan-500/30 hover:to-blue-500/30'
              : 'bg-gradient-to-r from-cyan-600/30 to-blue-600/30 border border-cyan-600/40 text-cyan-700 hover:from-cyan-600/40 hover:to-blue-600/40'
            : 'opacity-50 cursor-not-allowed'
        } transition-all duration-200 font-medium flex items-center justify-center gap-2`}
      >
        {sendTransactionMutation.isPending ? (
          <>
            <RefreshCw size={18} strokeWidth={2.5} className="animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send size={18} strokeWidth={2.5} />
            Send Transaction
          </>
        )}
      </button>
    </div>
  )
}
