'use client'

import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'
import { CHIA_ASSET_IDS } from '@/shared/lib/constants/chia-assets'
import { getAssetBalance } from '@/shared/lib/walletConnect/repositories/walletQueries.repository'
import { mojosToXch } from '@/shared/lib/utils/chia-units'
import { useNetwork } from '@/shared/hooks/useNetwork'
import { useXchUsdPrice } from '@/shared/hooks/useXchUsdPrice'
import { useCatTokens } from '@/entities/asset'
import { useSignClient } from './useSignClient'
import { useWalletSession } from './useWalletSession'
import { useWalletBalance } from './useWalletQueries'

const WALLET_CONNECT_KEY = 'walletConnect'
const BALANCE_KEY = 'balance'
const MAX_CAT_ASSETS_TO_FETCH = 80

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
  /** For XCH: balance in XCH; for CAT: raw spendable amount (display as-is or with decimals). */
  balance: number
  /** Spendable string from API (mojos for XCH). */
  spendableRaw: string
  balanceUsd: number | null
  type: WalletAssetType
}

/**
 * Get CAT/XCH price from tickers (last_price = XCH per 1 CAT).
 */
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

/**
 * Aggregates XCH balance + CAT balances for a bounded set of assets from Dexie.
 * Returns only assets with balance > 0 (plus always XCH if connected).
 */
export function useWalletAssets(): {
  assets: WalletAssetItem[]
  isLoading: boolean
  isError: boolean
  refetch: () => void
  /** When isLoading is true, reports how many asset balance checks have completed (XCH + CATs). */
  loadingProgress: { loaded: number; total: number } | null
} {
  const { network } = useNetwork()
  const { signClient } = useSignClient()
  const session = useWalletSession()
  const { data: xchBalance } = useWalletBalance(null, null)
  const { priceUsd: xchUsdPrice, isLoading: isLoadingPrice } = useXchUsdPrice()
  const {
    availableAssets,
    tickers,
    isLoading: isLoadingTickers,
  } = useCatTokens()

  const catAssetsToFetch = useMemo(() => {
    return availableAssets
      .filter((a) => a.assetId !== CHIA_ASSET_IDS.XCH && a.assetId !== '')
      .slice(0, MAX_CAT_ASSETS_TO_FETCH)
  }, [availableAssets])

  const catBalanceQueries = useQueries({
    queries: catAssetsToFetch.map((asset) => ({
      queryKey: [WALLET_CONNECT_KEY, BALANCE_KEY, 'cat', asset.assetId, network],
      queryFn: async () => {
        const result = await getAssetBalance(signClient ?? undefined, session, 'cat', asset.assetId)
        return result.success ? result.data : null
      },
      enabled: !!signClient && session.isConnected && !!asset.assetId,
    })),
  })

  const assets = useMemo(() => {
    const list: WalletAssetItem[] = []
    const connected = !!signClient && session.isConnected

    if (!connected) return list

    const rawTickers = (tickers || []) as TickerRow[]

    if (xchBalance?.spendable != null) {
      const xchBalanceNum = Number(xchBalance.spendable)
      const balanceXch = mojosToXch(xchBalanceNum)
      const balanceUsd =
        xchUsdPrice != null && balanceXch > 0 ? balanceXch * xchUsdPrice : null
      list.push({
        assetId: CHIA_ASSET_IDS.XCH,
        name: 'Chia',
        ticker: network === 'testnet' ? 'TXCH' : 'XCH',
        balance: balanceXch,
        spendableRaw: xchBalance.spendable,
        balanceUsd,
        type: 'xch',
      })
    }

    catAssetsToFetch.forEach((asset, index) => {
      const result = catBalanceQueries[index]?.data as
        | { spendable?: string; confirmed?: string }
        | null
        | undefined
      if (!result?.spendable) return
      const spendableNum = Number(result.spendable)
      if (spendableNum <= 0) return

      const catPriceXch = getCatPriceInXch(rawTickers, asset.assetId, network)
      const balanceUsd =
        catPriceXch != null && xchUsdPrice != null
          ? spendableNum * catPriceXch * xchUsdPrice
          : null

      list.push({
        assetId: asset.assetId,
        name: asset.name ?? asset.ticker,
        ticker: asset.ticker,
        balance: spendableNum,
        spendableRaw: result.spendable,
        balanceUsd,
        type: 'cat',
      })
    })

    return list
  }, [
    signClient,
    session.isConnected,
    xchBalance,
    xchUsdPrice,
    network,
    tickers,
    catAssetsToFetch,
    catBalanceQueries,
  ])

  const isLoading =
    isLoadingPrice ||
    isLoadingTickers ||
    catBalanceQueries.some((q) => q.isLoading)
  const isError = catBalanceQueries.some((q) => q.isError)

  const totalToLoad = 1 + catAssetsToFetch.length
  const xchLoaded = xchBalance !== undefined ? 1 : 0
  const catLoaded = catBalanceQueries.filter((q) => q.isFetched).length
  const loadingProgress: { loaded: number; total: number } | null =
    isLoading && totalToLoad > 0
      ? { loaded: xchLoaded + catLoaded, total: totalToLoad }
      : null

  const refetch = () => {
    catBalanceQueries.forEach((q) => q.refetch())
  }

  return { assets, isLoading, isError, refetch, loadingProgress }
}
