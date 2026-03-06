'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { CHIA_ASSET_IDS } from '@/shared/lib/constants/chia-assets'
import { convertFromSmallestUnit } from '@/shared/lib/utils/chia-units'
import { useNetwork } from '@/shared/hooks/useNetwork'
import { useXchUsdPrice } from '@/shared/hooks/useXchUsdPrice'
import { useCatTokens, type DexieTicker } from '@/entities/asset'
import { getAssetBalance } from '@/shared/lib/walletConnect/repositories/walletQueries.repository'
import { useSignClient } from './useSignClient'
import { useWalletSession } from './useWalletSession'
import { useWalletBalance } from './useWalletQueries'

export type WalletAssetType = 'xch' | 'cat' | 'investment'

export interface WalletAssetItem {
  assetId: string
  name: string
  ticker: string
  balance: number
  spendableRaw: string
  balanceUsd: number | null
  type: WalletAssetType
}

const MAX_CATS_TO_CHECK = 50
const BATCH_SIZE = 5
const BATCH_DELAY_MS = 1500

function buildVolumeMap(rawTickers: DexieTicker[]): Map<string, number> {
  return rawTickers
    .filter((t) => !!t.base_currency)
    .reduce((map, t) => {
      const existing = map.get(t.base_currency) ?? 0
      map.set(t.base_currency, existing + (t.target_volume ?? 0))
      return map
    }, new Map<string, number>())
}

/**
 * Queries XCH balance + top CAT balances via WalletConnect.
 * CATs are queried in small batches to avoid flooding the relay.
 * Only assets with a non-zero balance appear in the returned list.
 */
export function useWalletAssets(): {
  assets: WalletAssetItem[]
  isLoading: boolean
  refetch: () => void
} {
  const { network } = useNetwork()
  const { signClient } = useSignClient()
  const session = useWalletSession()
  const { data: xchBalance, refetch: refetchXch } = useWalletBalance(null, null)
  const { priceUsd: xchUsdPrice, isLoading: isLoadingPrice } = useXchUsdPrice()
  const { availableAssets, tickers, isLoading: isLoadingTickers } = useCatTokens()

  const isWalletReady = !!signClient && session.isConnected

  const catAssetsToCheck = useMemo(() => {
    const rawTickers = (tickers ?? []) as DexieTicker[]
    const volumeMap = buildVolumeMap(rawTickers)
    return availableAssets
      .filter((a) => a.assetId !== CHIA_ASSET_IDS.XCH && a.assetId !== '')
      .sort((a, b) => (volumeMap.get(b.assetId) ?? 0) - (volumeMap.get(a.assetId) ?? 0))
      .slice(0, MAX_CATS_TO_CHECK)
  }, [availableAssets, tickers])

  const [enabledCount, setEnabledCount] = useState(0)

  useEffect(() => {
    setEnabledCount(0)
  }, [isWalletReady, network])

  useEffect(() => {
    if (!isWalletReady || catAssetsToCheck.length === 0) return
    if (enabledCount >= catAssetsToCheck.length) return

    const delay = enabledCount === 0 ? 500 : BATCH_DELAY_MS
    const timer = setTimeout(() => {
      setEnabledCount((prev) => Math.min(prev + BATCH_SIZE, catAssetsToCheck.length))
    }, delay)

    return () => clearTimeout(timer)
  }, [isWalletReady, enabledCount, catAssetsToCheck.length])

  const { catBalances, isCatLoading } = useQueries({
    queries: catAssetsToCheck.map((asset, index) => ({
      queryKey: ['walletConnect', 'balance', 'cat' as const, asset.assetId, network],
      queryFn: async () => {
        const result = await getAssetBalance(signClient, session, 'cat', asset.assetId)
        if (!result.success) throw new Error(result.error)
        return result.data
      },
      enabled: isWalletReady && index < enabledCount,
      staleTime: Infinity,
      retry: 1,
    })),
    combine: (results) => ({
      catBalances: results.map((r) => r.data ?? null),
      isCatLoading: results.some((r) => r.isLoading),
    }),
  })

  const assets = useMemo(() => {
    const list: WalletAssetItem[] = []

    if (isWalletReady && xchBalance?.spendable != null) {
      const bal = convertFromSmallestUnit(Number(xchBalance.spendable), 'xch')
      if (bal > 0) {
        list.push({
          assetId: CHIA_ASSET_IDS.XCH,
          name: 'Chia',
          ticker: network === 'testnet' ? 'TXCH' : 'XCH',
          balance: bal,
          spendableRaw: xchBalance.spendable,
          balanceUsd: xchUsdPrice != null ? bal * xchUsdPrice : null,
          type: 'xch',
        })
      }
    }

    catAssetsToCheck.forEach((asset, index) => {
      const data = catBalances[index]
      if (!data?.spendable) return
      const spendable = Number(data.spendable)
      if (spendable <= 0) return
      const bal = convertFromSmallestUnit(spendable, 'cat')
      list.push({
        assetId: asset.assetId,
        name: asset.name ?? asset.ticker,
        ticker: asset.ticker,
        balance: bal,
        spendableRaw: data.spendable,
        balanceUsd: null,
        type: 'cat',
      })
    })

    return list
  }, [isWalletReady, xchBalance, xchUsdPrice, network, catAssetsToCheck, catBalances])

  const isLoading = isLoadingPrice || isLoadingTickers || isCatLoading

  return { assets, isLoading, refetch: refetchXch }
}
