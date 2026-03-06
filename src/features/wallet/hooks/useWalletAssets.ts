'use client'

import { useQueries } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CHIA_ASSET_IDS } from '@/shared/lib/constants/chia-assets'
import { getAssetBalance } from '@/shared/lib/walletConnect/repositories/walletQueries.repository'
import { mojosToXch } from '@/shared/lib/utils/chia-units'
import { useNetwork } from '@/shared/hooks/useNetwork'
import { useXchUsdPrice } from '@/shared/hooks/useXchUsdPrice'
import { useCatTokens, type DexieTicker } from '@/entities/asset'
import { useSignClient } from './useSignClient'
import { useWalletSession } from './useWalletSession'
import { useWalletBalance } from './useWalletQueries'

const WALLET_CONNECT_KEY = 'walletConnect'
const BALANCE_KEY = 'balance'

// Only check the top tokens by volume. Sage requires one WalletConnect RPC per
// token (no bulk API), so keeping this bounded avoids relay flooding.
const MAX_CATS_TO_CHECK = 50
const BATCH_SIZE = 5
const STALE_TIME = 10 * 60 * 1000
const GC_TIME = 15 * 60 * 1000

type TickerRow = {
  base_currency?: string
  target_currency?: string
  last_price?: number
}

export type WalletAssetType = 'xch' | 'cat' | 'investment'

export interface WalletAssetItem {
  assetId: string
  name: string
  ticker: string
  /** For XCH: balance in XCH; for CAT: raw spendable amount. */
  balance: number
  /** Spendable string from API (mojos for XCH). */
  spendableRaw: string
  balanceUsd: number | null
  type: WalletAssetType
}

function getCatPriceInXch(
  tickers: TickerRow[],
  assetId: string,
  network: string
): number | null {
  const xchId = network === 'testnet' ? 'TXCH' : 'XCH'
  const pair = tickers.find(
    (t) =>
      t.base_currency === assetId &&
      (t.target_currency === xchId || t.target_currency === 'xch' || t.target_currency === 'XCH')
  )
  return pair && typeof pair.last_price === 'number' ? pair.last_price : null
}

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
 * Aggregates XCH + CAT balances from the connected Sage wallet.
 *
 * Sage's CHIP-0002 API has no bulk balance endpoint — each CAT requires its
 * own WalletConnect RPC. To stay reliable we only check the top
 * MAX_CATS_TO_CHECK tokens (ranked by Dexie volume) in small batches.
 */
export function useWalletAssets(): {
  assets: WalletAssetItem[]
  isLoading: boolean
  isError: boolean
  refetch: () => void
} {
  const { network } = useNetwork()
  const { signClient } = useSignClient()
  const session = useWalletSession()
  const { data: xchBalance } = useWalletBalance(null, null)
  const { priceUsd: xchUsdPrice, isLoading: isLoadingPrice } = useXchUsdPrice()
  const { availableAssets, tickers, isLoading: isLoadingTickers } = useCatTokens()

  const isWalletReady = !!signClient && session.isConnected

  const catAssets = useMemo(() => {
    const rawTickers = (tickers ?? []) as DexieTicker[]
    const volumeMap = buildVolumeMap(rawTickers)

    return availableAssets
      .filter((a) => a.assetId !== CHIA_ASSET_IDS.XCH && a.assetId !== '')
      .sort((a, b) => (volumeMap.get(b.assetId) ?? 0) - (volumeMap.get(a.assetId) ?? 0))
      .slice(0, MAX_CATS_TO_CHECK)
  }, [availableAssets, tickers])

  const [enabledCount, setEnabledCount] = useState(BATCH_SIZE)

  const catalogKey = `${network}-${catAssets.length}-${isWalletReady}`
  const prevCatalogKey = useRef(catalogKey)
  useEffect(() => {
    if (prevCatalogKey.current !== catalogKey) {
      prevCatalogKey.current = catalogKey
      setEnabledCount(BATCH_SIZE)
    }
  }, [catalogKey])

  const catBalanceQueries = useQueries({
    queries: catAssets.map((asset, index) => ({
      queryKey: [WALLET_CONNECT_KEY, BALANCE_KEY, 'cat', asset.assetId, network],
      queryFn: async () => {
        const result = await getAssetBalance(signClient ?? undefined, session, 'cat', asset.assetId)
        return result.success ? result.data : null
      },
      enabled: isWalletReady && !!asset.assetId && index < enabledCount,
      staleTime: STALE_TIME,
      gcTime: GC_TIME,
      retry: 1,
      retryDelay: 1000,
    })),
  })

  const batchFetchedCount = useMemo(
    () =>
      catBalanceQueries
        .slice(0, Math.min(enabledCount, catBalanceQueries.length))
        .filter((q) => q.isFetched).length,
    [catBalanceQueries, enabledCount]
  )

  useEffect(() => {
    if (!isWalletReady || enabledCount >= catAssets.length) return
    if (batchFetchedCount >= enabledCount) {
      setEnabledCount((c) => Math.min(c + BATCH_SIZE, catAssets.length))
    }
  }, [batchFetchedCount, enabledCount, catAssets.length, isWalletReady])

  const assets = useMemo(() => {
    if (!isWalletReady) return []

    const list: WalletAssetItem[] = []
    const rawTickers = (tickers || []) as TickerRow[]

    if (xchBalance?.spendable != null) {
      const bal = mojosToXch(Number(xchBalance.spendable))
      list.push({
        assetId: CHIA_ASSET_IDS.XCH,
        name: 'Chia',
        ticker: network === 'testnet' ? 'TXCH' : 'XCH',
        balance: bal,
        spendableRaw: xchBalance.spendable,
        balanceUsd: xchUsdPrice != null && bal > 0 ? bal * xchUsdPrice : null,
        type: 'xch',
      })
    }

    catAssets.forEach((asset, index) => {
      const data = catBalanceQueries[index]?.data as
        | { spendable?: string; confirmed?: string }
        | null
        | undefined
      if (!data?.spendable) return
      const amount = Number(data.spendable)
      if (amount <= 0) return

      const catPriceXch = getCatPriceInXch(rawTickers, asset.assetId, network)
      list.push({
        assetId: asset.assetId,
        name: asset.name ?? asset.ticker,
        ticker: asset.ticker,
        balance: amount,
        spendableRaw: data.spendable,
        balanceUsd:
          catPriceXch != null && xchUsdPrice != null ? amount * catPriceXch * xchUsdPrice : null,
        type: 'cat',
      })
    })

    return list
  }, [isWalletReady, xchBalance, xchUsdPrice, network, tickers, catAssets, catBalanceQueries])

  const totalFetched = catBalanceQueries.filter((q) => q.isFetched).length
  const allCatsFetched = catAssets.length === 0 || totalFetched >= catAssets.length
  const isLoading = isLoadingPrice || isLoadingTickers || (isWalletReady && !allCatsFetched)
  const isError = catBalanceQueries.some((q) => q.isError)

  const refetch = () => {
    setEnabledCount(BATCH_SIZE)
    catBalanceQueries.forEach((q) => q.refetch())
  }

  return { assets, isLoading, isError, refetch }
}
