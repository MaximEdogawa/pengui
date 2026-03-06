'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTickers, type DexieTicker } from '@/entities/asset'
import { useNetwork } from '@/shared/hooks/useNetwork'
import { getDexieApiUrl } from '@/shared/lib/utils/networkUtils'
import { isChiaNativeToken } from '@/shared/lib/constants/chia-assets'
import { aggregateTradesToOHLC } from '@/features/trading/lib/utils/chartUtils'
import type { OHLCData, Timeframe } from '@/features/trading/lib/chartTypes'

const BYC_TICKER = 'BYC'

/**
 * Resolve the Dexie ticker_id for a given asset.
 *
 * - XCH: looks for BYC/XCH (used to derive XCH/USD price chart)
 * - CAT:  looks for ASSET/XCH
 *
 * Returns { tickerId, inverted } where inverted=true means the price
 * should be shown as 1/price (e.g. BYC/XCH → XCH/BYC = XCH price).
 */
function resolveAssetTicker(
  assetId: string,
  tickers: DexieTicker[],
): { tickerId: string | null; inverted: boolean } {
  if (tickers.length === 0) return { tickerId: null, inverted: false }

  const isXch = isChiaNativeToken(assetId)

  if (isXch) {
    const byc = tickers.find(
      (t) =>
        t.base_code === BYC_TICKER &&
        (t.target_code === 'XCH' || t.target_code === 'TXCH'),
    )
    return { tickerId: byc?.ticker_id ?? null, inverted: true }
  }

  // CAT: find base_currency === assetId and target is XCH/TXCH
  const match = tickers.find(
    (t) =>
      t.base_currency === assetId &&
      (t.target_code === 'XCH' || t.target_code === 'TXCH'),
  )
  return { tickerId: match?.ticker_id ?? null, inverted: false }
}

export function useAssetPriceChart(assetId: string, timeframe: Timeframe = '1D') {
  const { network } = useNetwork()
  const { data: tickersData, isLoading: isLoadingTickers } = useTickers()
  const tickers = useMemo(() => tickersData?.data ?? [], [tickersData?.data])
  const dexieBaseUrl = getDexieApiUrl(network)

  const { tickerId, inverted } = useMemo(
    () => resolveAssetTicker(assetId, tickers as DexieTicker[]),
    [assetId, tickers],
  )

  const {
    data: rawTrades,
    isLoading: isLoadingTrades,
    isError,
    error,
  } = useQuery({
    queryKey: ['assetPriceChart', network, tickerId, timeframe],
    queryFn: async () => {
      const url = `${dexieBaseUrl}/v3/prices/historical_trades?ticker_id=${tickerId}&limit=10000`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Dexie API ${res.status}`)
      const json = await res.json()
      const trades = json.trades ?? json.data ?? (Array.isArray(json) ? json : [])
      return trades as unknown[]
    },
    enabled: !!tickerId && !isLoadingTickers,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 2,
    refetchOnWindowFocus: false,
  })

  const ohlcData = useMemo<OHLCData[]>(() => {
    if (!rawTrades || rawTrades.length === 0) return []

    const aggregated = aggregateTradesToOHLC(rawTrades as never[], timeframe)

    if (!inverted) return aggregated

    return aggregated.map((c) => ({
      time: c.time,
      open: c.open > 0 ? 1 / c.open : 0,
      high: c.low > 0 ? 1 / c.low : 0,
      low: c.high > 0 ? 1 / c.high : 0,
      close: c.close > 0 ? 1 / c.close : 0,
      volume: c.volume,
    }))
  }, [rawTrades, timeframe, inverted])

  const isLoading = isLoadingTickers || isLoadingTrades
  const hasChart = !!tickerId

  return {
    ohlcData,
    isLoading,
    isError,
    error,
    hasChart,
    tickerId,
    inverted,
  }
}
