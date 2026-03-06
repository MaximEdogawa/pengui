'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueries } from '@tanstack/react-query'
import { useWalletConnectionState } from '@maximedogawa/chia-wallet-connect-react'
import { CHIA_ASSET_IDS, XCH_BASE_CURRENCIES } from '@/shared/lib/constants/chia-assets'
import { convertFromSmallestUnit } from '@/shared/lib/utils/chia-units'
import { useNetwork } from '@/shared/hooks/useNetwork'
import { useXchUsdPrice } from '@/shared/hooks/useXchUsdPrice'
import { useCatTokens, type DexieTicker } from '@/entities/asset'
import { getAssetBalance } from '@/shared/lib/walletConnect/repositories/walletQueries.repository'
import { fetchWalletTokenBalances } from '@/shared/lib/services/spaceScanService'
import { getAdaptiveConfig } from '@/shared/lib/utils/networkQuality'
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
  priceXch: number | null
  priceUsd: number | null
  balanceUsd: number | null
  type: WalletAssetType
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
 * Build a map of asset_id -> last_price (in XCH) from Dexie tickers.
 * Only considers pairs where the target currency is XCH/TXCH.
 * When multiple pools exist for the same asset, the highest-volume one wins.
 */
function buildPriceXchMap(rawTickers: DexieTicker[]): Map<string, number> {
  const map = new Map<string, number>()
  const volumeMap = new Map<string, number>()

  for (const t of rawTickers) {
    if (!t.base_currency || !XCH_BASE_CURRENCIES.has(t.target_currency)) continue
    const price = Number(t.last_price)
    if (!price || isNaN(price)) continue
    const prevVol = volumeMap.get(t.base_currency) ?? 0
    const vol = Number(t.target_volume) || 0
    if (!map.has(t.base_currency) || vol > prevVol) {
      map.set(t.base_currency, price)
      volumeMap.set(t.base_currency, vol)
    }
  }

  return map
}

/**
 * Queries XCH balance + CAT balances via WalletConnect.
 *
 * Uses SpaceScan's token-balance endpoint to discover which CATs the wallet
 * actually holds, then only queries WalletConnect for those specific assets.
 * Falls back to the top-volume approach when SpaceScan is unavailable.
 */
export function useWalletAssets(): {
  assets: WalletAssetItem[]
  isLoading: boolean
  refetch: () => void
} {
  const { network } = useNetwork()
  const { signClient } = useSignClient()
  const session = useWalletSession()
  const { address } = useWalletConnectionState()
  const { data: xchBalance, refetch: refetchXch } = useWalletBalance(null, null)
  const { priceUsd: xchUsdPrice, isLoading: isLoadingPrice } = useXchUsdPrice()
  const { availableAssets, tickers, getAsset, isLoading: isLoadingTickers } = useCatTokens()

  const netCfg = useMemo(() => getAdaptiveConfig(), [])
  const isWalletReady = !!signClient && session.isConnected

  // ---- SpaceScan discovery: get all asset IDs the wallet holds ----
  const {
    data: spaceScanTokens,
    isLoading: isLoadingSpaceScan,
  } = useQuery({
    queryKey: ['spacescan', 'token-balance', address, network],
    queryFn: () => fetchWalletTokenBalances(address!, network),
    enabled: isWalletReady && !!address,
    staleTime: netCfg.staleTimeMs,
    gcTime: netCfg.gcTimeMs,
    retry: netCfg.retryCount,
  })

  const spaceScanReady = !isLoadingSpaceScan && spaceScanTokens !== undefined
  const spaceScanHasData = (spaceScanTokens?.length ?? 0) > 0

  // ---- Determine which CATs to query via WalletConnect ----
  const catAssetsToCheck = useMemo(() => {
    if (spaceScanReady && spaceScanHasData) {
      return spaceScanTokens!.map((t) => {
        const dexieAsset = getAsset(t.asset_id)
        return {
          assetId: t.asset_id,
          name: dexieAsset?.name ?? t.name ?? t.symbol ?? t.asset_id,
          ticker: dexieAsset?.ticker ?? t.symbol ?? '',
        }
      })
    }

    const rawTickers = (tickers ?? []) as DexieTicker[]
    const volumeMap = buildVolumeMap(rawTickers)
    return availableAssets
      .filter((a) => a.assetId !== CHIA_ASSET_IDS.XCH && a.assetId !== '')
      .sort((a, b) => (volumeMap.get(b.assetId) ?? 0) - (volumeMap.get(a.assetId) ?? 0))
      .slice(0, netCfg.maxCatsToCheck)
  }, [spaceScanReady, spaceScanHasData, spaceScanTokens, availableAssets, tickers, netCfg.maxCatsToCheck])

  // ---- Batch-enable WalletConnect queries to avoid relay flooding ----
  const [enabledCount, setEnabledCount] = useState(0)

  useEffect(() => {
    setEnabledCount(0)
  }, [isWalletReady, network, spaceScanReady])

  useEffect(() => {
    if (!isWalletReady || catAssetsToCheck.length === 0) return
    if (enabledCount >= catAssetsToCheck.length) return

    const delay = enabledCount === 0 ? 500 : netCfg.batchDelayMs
    const timer = setTimeout(() => {
      setEnabledCount((prev) => Math.min(prev + netCfg.batchSize, catAssetsToCheck.length))
    }, delay)

    return () => clearTimeout(timer)
  }, [isWalletReady, enabledCount, catAssetsToCheck.length, netCfg.batchSize, netCfg.batchDelayMs])

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
      gcTime: netCfg.gcTimeMs,
      retry: netCfg.retryCount,
    })),
    combine: (results) => ({
      catBalances: results.map((r) => r.data ?? null),
      isCatLoading: results.some((r) => r.isLoading),
    }),
  })

  // ---- Build price map ----
  const priceXchMap = useMemo(
    () => buildPriceXchMap((tickers ?? []) as DexieTicker[]),
    [tickers],
  )

  // ---- Build the final asset list ----
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
          priceXch: 1,
          priceUsd: xchUsdPrice,
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

      const dexieAsset = getAsset(asset.assetId)
      const priceXch = priceXchMap.get(asset.assetId) ?? null
      const priceUsd =
        priceXch != null && xchUsdPrice != null ? priceXch * xchUsdPrice : null
      list.push({
        assetId: asset.assetId,
        name: dexieAsset?.name ?? asset.name ?? asset.ticker,
        ticker: dexieAsset?.ticker ?? asset.ticker,
        balance: bal,
        spendableRaw: data.spendable,
        priceXch,
        priceUsd,
        balanceUsd: priceUsd != null ? bal * priceUsd : null,
        type: 'cat',
      })
    })

    return list
  }, [isWalletReady, xchBalance, xchUsdPrice, network, catAssetsToCheck, catBalances, priceXchMap, getAsset])

  const isLoading = isLoadingPrice || isLoadingTickers || isLoadingSpaceScan || isCatLoading

  return { assets, isLoading, refetch: refetchXch }
}
