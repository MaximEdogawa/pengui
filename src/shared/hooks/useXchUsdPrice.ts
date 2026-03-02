'use client'

import { useTickers } from '@/entities/asset/hooks/useTickers'
import { useNetwork } from '@/shared/hooks/useNetwork'
import { useMemo } from 'react'

/**
 * XCH/USD price from Dexie tickers (e.g. XCH-USDT or TXCH-USDT).
 * Shared by dashboard and wallet for consistent USD values.
 */
export function useXchUsdPrice(): {
  priceUsd: number | null
  isLoading: boolean
  isError: boolean
} {
  const { network } = useNetwork()
  const { data, isLoading, isError } = useTickers()

  const priceUsd = useMemo(() => {
    if (!data?.success || !Array.isArray(data.data)) return null
    const tickers = data.data as Array<{
      base_code?: string
      target_code?: string
      last_price?: number
    }>
    // Mainnet: XCH/USDT; testnet: TXCH/USDT or similar
    const xchCode = network === 'testnet' ? 'TXCH' : 'XCH'
    const usdQuote = ['USDT', 'USD'].find((q) =>
      tickers.some(
        (t) =>
          (t.base_code === xchCode || t.base_code === 'XCH') &&
          (t.target_code === q || t.target_code === 'USDT')
      )
    )
    const pair = tickers.find(
      (t) =>
        (t.base_code === xchCode || t.base_code === 'XCH') &&
        (t.target_code === usdQuote || t.target_code === 'USDT' || t.target_code === 'USD')
    )
    return pair && typeof pair.last_price === 'number' ? pair.last_price : null
  }, [data, network])

  return { priceUsd, isLoading, isError }
}
