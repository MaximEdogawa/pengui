'use client'

import { useTickers } from '@/entities/asset'
import { useNetwork } from '@/shared/hooks/useNetwork'
import { useOrderBook } from './useOrderBook'
import { useOrderBookFilters } from './OrderBookFiltersProvider'
import { useMemo } from 'react'
import { usePriceData } from './usePriceData'
import { resolveTickerId, getTickerById } from '../lib/tickerResolution'
import { transformOrderBookForChart, generateSyntheticOHLCFromOrderBook } from '../lib/utils/chartUtils'
import { calculateIndicatorsFromOHLC } from '../lib/indicators'
import { logger } from '@/shared/lib/logger'
import type { ChartConfig } from '../lib/chartTypes'

interface UsePriceChartOptions {
  config: ChartConfig
}

const EMPTY_INDICATORS = {
  sma: {},
  ema: {},
  rsi: [],
  macd: [],
  bollingerBands: [],
}

export function usePriceChart({ config }: UsePriceChartOptions) {
  const { network } = useNetwork()
  const { filters } = useOrderBookFilters()
  const { data: tickersData, isLoading: isLoadingTickers } = useTickers()
  const tickers = useMemo(() => tickersData?.data || [], [tickersData?.data])

  // Only resolve tickerId when tickers are loaded for the current network.
  // Network is included in dependencies to force recalculation when network changes,
  // preventing use of stale tickerId from previous network during the transition period.
  const tickerId = useMemo(() => {
    if (!filters || tickers.length === 0 || isLoadingTickers) return null
    // Network change triggers this recalculation, ensuring we wait for new network's tickers
    return resolveTickerId(filters, tickers)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- network needed to clear tickerId on network switch
  }, [filters, tickers, isLoadingTickers, network])

  const tickerInfo = useMemo(() => {
    if (!tickerId || tickers.length === 0) return null
    return getTickerById(tickerId, tickers)
  }, [tickerId, tickers])

  const tickerDisplayName = useMemo(() => {
    if (!tickerInfo) return tickerId ?? 'Unknown'
    const base = tickerInfo.base_code ?? tickerInfo.base_name ?? 'Unknown'
    const target = tickerInfo.target_code ?? tickerInfo.target_name ?? 'Unknown'
    return `${base}/${target}`
  }, [tickerInfo, tickerId])

  const {
    ohlcData,
    isLoading: isLoadingOHLC,
    isError: isErrorOHLC,
    error: ohlcError,
    refetch: refetchOHLC,
    hasCachedData,
    isSuccess: isPriceDataSuccess,
  } = usePriceData({
    tickerId,
    timeframe: config.timeframe,
    filters,
    enabled: !!tickerId,
  })

  const { orderBookData } = useOrderBook(filters)

  const orderBookChartData = useMemo(
    () => transformOrderBookForChart(orderBookData, filters),
    [orderBookData, filters]
  )

  // Only use synthetic data if:
  // 1. We have no OHLC data
  // 2. We have no cached/successful price data (to avoid showing synthetic when real data exists)
  // 3. Order book has data available
  // 4. Not currently loading OHLC data (give cached data time to process)
  const syntheticOHLC = useMemo(() => {
    // Don't use synthetic data if we have cached data or successful price data
    // This ensures we prioritize real price data from TanStack Query cache
    if (hasCachedData || isPriceDataSuccess) return []
    
    if (
      ohlcData.length === 0 && 
      orderBookChartData.bestBid && 
      orderBookChartData.bestAsk &&
      !isLoadingOHLC
    ) {
      return generateSyntheticOHLCFromOrderBook(orderBookChartData, config.timeframe)
    }
    return []
  }, [ohlcData.length, hasCachedData, isPriceDataSuccess, orderBookChartData, config.timeframe, isLoadingOHLC])

  // Prioritize real OHLC data over synthetic data
  // Only use synthetic if we have no real data and no cached/successful data is available
  const chartOHLCData = ohlcData.length > 0 ? ohlcData : syntheticOHLC
  const isUsingSyntheticData = ohlcData.length === 0 && !hasCachedData && !isPriceDataSuccess && syntheticOHLC.length > 0

  // Debug logging to trace data flow
  useMemo(() => {
    logger.info('📊 Price chart data state summary', {
      tickerId: tickerId || 'NOT SET',
      tickerDisplayName: tickerDisplayName || 'NOT SET',
      filters: {
        buyAsset: filters?.buyAsset || [],
        sellAsset: filters?.sellAsset || [],
      },
      dataFlow: {
        ohlcDataLength: ohlcData.length,
        syntheticOHLCLength: syntheticOHLC.length,
        chartOHLCLength: chartOHLCData.length,
        hasCachedData,
        isPriceDataSuccess,
        isLoadingOHLC,
        isUsingSyntheticData,
      },
      firstCandle: chartOHLCData[0] ? {
        time: chartOHLCData[0].time,
        timeType: typeof chartOHLCData[0].time,
        open: chartOHLCData[0].open,
        high: chartOHLCData[0].high,
        low: chartOHLCData[0].low,
        close: chartOHLCData[0].close,
        volume: chartOHLCData[0].volume,
      } : 'NO DATA',
      lastCandle: chartOHLCData.length > 0 ? {
        time: chartOHLCData[chartOHLCData.length - 1].time,
        open: chartOHLCData[chartOHLCData.length - 1].open,
        high: chartOHLCData[chartOHLCData.length - 1].high,
        low: chartOHLCData[chartOHLCData.length - 1].low,
        close: chartOHLCData[chartOHLCData.length - 1].close,
        volume: chartOHLCData[chartOHLCData.length - 1].volume,
      } : 'NO DATA',
    })
  }, [tickerId, ohlcData.length, syntheticOHLC.length, hasCachedData, isPriceDataSuccess, isLoadingOHLC, isUsingSyntheticData, chartOHLCData, tickerDisplayName, filters])

  const indicators = useMemo(() => {
    if (chartOHLCData.length === 0) return EMPTY_INDICATORS

    return calculateIndicatorsFromOHLC(chartOHLCData, {
      sma: config.indicators.sma.enabled ? config.indicators.sma.periods : undefined,
      ema: config.indicators.ema.enabled ? config.indicators.ema.periods : undefined,
      rsi: config.indicators.rsi,
      macd: config.indicators.macd,
      bollingerBands: config.indicators.bollingerBands,
    })
  }, [chartOHLCData, config.indicators])

  return {
    ohlcData: chartOHLCData,
    isLoadingOHLC,
    isErrorOHLC,
    ohlcError,
    refetchOHLC,
    isUsingSyntheticData,
    orderBookData: orderBookChartData,
    indicators,
    tickerId,
    tickerDisplayName: tickerDisplayName ?? 'Unknown',
    hasData: chartOHLCData.length > 0,
    filters,
  }
}
