'use client'

import { useTickers } from '@/shared/hooks/useTickers'
import { useOrderBook } from './useOrderBook'
import { useOrderBookFilters } from './OrderBookFiltersProvider'
import { useMemo } from 'react'
import { usePriceData } from './usePriceData'
import { resolveTickerId, getTickerById } from '../lib/tickerResolution'
import { transformOrderBookForChart, generateSyntheticOHLCFromOrderBook } from '../lib/utils/chartUtils'
import { calculateIndicatorsFromOHLC } from '../lib/indicators'
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
  const { filters } = useOrderBookFilters()
  const { data: tickersData } = useTickers()
  const tickers = tickersData?.data || []

  const tickerId = useMemo(() => {
    if (!filters || tickers.length === 0) return null
    return resolveTickerId(filters, tickers)
  }, [filters, tickers])

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
  } = usePriceData({
    tickerId,
    timeframe: config.timeframe,
    enabled: !!tickerId,
  })

  const { orderBookData } = useOrderBook(filters)

  const orderBookChartData = useMemo(
    () => transformOrderBookForChart(orderBookData, filters),
    [orderBookData, filters]
  )

  const syntheticOHLC = useMemo(() => {
    if (
      ohlcData.length === 0 && 
      orderBookChartData.bestBid && 
      orderBookChartData.bestAsk &&
      !isLoadingOHLC
    ) {
      return generateSyntheticOHLCFromOrderBook(orderBookChartData, config.timeframe)
    }
    return []
  }, [ohlcData.length, orderBookChartData, config.timeframe, isLoadingOHLC])

  const chartOHLCData = ohlcData.length > 0 ? ohlcData : syntheticOHLC
  const isUsingSyntheticData = ohlcData.length === 0 && syntheticOHLC.length > 0

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
