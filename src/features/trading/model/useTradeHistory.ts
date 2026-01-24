'use client'

import { useCallback, useMemo } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useMyTrades } from './useMyTrades'
import { useTradeHistoryFilters, type TradeHistoryFilters } from './useTradeHistoryFilters'
import { useOrderBook } from './useOrderBook'
import { normalizeTickerForApi } from '../lib/orderBookParams'
import { useNetwork } from '@/shared/hooks/useNetwork'
import { useWalletAddress } from '@/features/wallet/model/useWalletQueries'
import { getDexieApiUrl } from '@/shared/lib/utils/networkUtils'
import { offerStorageService } from '@/shared/lib/services/offerStorageService'
import type { DexieOffer, OfferState } from '@/entities/offer'
import type { OrderBookFilters } from '../lib/orderBookTypes'

/** Fetch one page of offers for a given Dexie status (2=Pending, 3=Cancelled, 4=Completed). */
async function fetchOffersForStatus(
  dexieBaseUrl: string,
  opts: {
    targetRequested?: string
    targetOffered?: string
    myTradesOnly: boolean
    walletAddress: string | undefined
    status: number
    sort: string
    pageParam: number
  }
): Promise<DexieOffer[]> {
  const { targetRequested, targetOffered, myTradesOnly, walletAddress, status, sort, pageParam } =
    opts
  if (!targetRequested && !targetOffered) return []

  const q = new URLSearchParams()
  if (targetRequested) q.append('requested', targetRequested)
  if (targetOffered) q.append('offered', targetOffered)
  q.append('sort', sort)
  q.append('page_size', String(PAGE_SIZE))
  q.append('page', String(pageParam))
  q.append('status', String(status))
  if (myTradesOnly && walletAddress) q.append('maker', walletAddress)

  const res = await fetch(`${dexieBaseUrl}/v1/offers?${q.toString()}`)
  if (!res.ok) throw new Error(`Failed to fetch offers: ${res.status}`)

  const data = await res.json()
  let list: DexieOffer[] = []
  if (Array.isArray(data)) list = data as DexieOffer[]
  else if (data && typeof data === 'object') {
    if (Array.isArray((data as { data?: unknown[] }).data)) list = (data as { data: DexieOffer[] }).data
    else if (Array.isArray((data as { offers?: unknown[] }).offers)) list = (data as { offers: DexieOffer[] }).offers
  }

  const match = (a: { code?: string; id?: string } | undefined, t: string) =>
    !!a && [a.code, a.id].some((v) => v && String(v).toLowerCase() === t.toLowerCase())
  return list.filter((o) => {
    if (!o?.id || (o.offered?.length ?? 0) === 0 || (o.requested?.length ?? 0) === 0) return false
    if (targetRequested && !o.requested?.some((a) => match(a, targetRequested))) return false
    if (targetOffered && !o.offered?.some((a) => match(a, targetOffered))) return false
    return true
  })
}

function mergeStatusOffers(
  sources: { show: boolean; pages: DexieOffer[][] | undefined; offerState: OfferState }[],
  getIsMyOffer: (o: DexieOffer) => boolean
): TradeHistoryOfferItem[] {
  const out: TradeHistoryOfferItem[] = []
  for (const { show, pages, offerState } of sources) {
    if (!show || !pages) continue
    const raw = pages.flat()
    out.push(...raw.map((o) => ({ offer: o, offerState, isMyOffer: getIsMyOffer(o) })))
  }
  return out
}

function buildNextPageState(filters: TradeHistoryFilters, completedHasNext: boolean, cancelledHasNext: boolean, pendingHasNext: boolean) {
  return filters.showCompleted && completedHasNext || filters.showCancelled && cancelledHasNext || filters.showPending && pendingHasNext
}

function buildIsFetching(completedFetching: boolean, cancelledFetching: boolean, pendingFetching: boolean) {
  return completedFetching || cancelledFetching || pendingFetching
}

function buildLoadingState(filters: TradeHistoryFilters, completedLoading: boolean, cancelledLoading: boolean, pendingLoading: boolean, orderBookLoading: boolean) {
  return (filters.showOpen && orderBookLoading) || (filters.showCompleted && completedLoading) || (filters.showCancelled && cancelledLoading) || (filters.showPending && pendingLoading)
}

export interface TradeHistoryOfferItem {
  offer: DexieOffer
  offerState: OfferState
  isMyOffer: boolean
}

export interface TradeHistoryOptions {
  orderBookFilters?: OrderBookFilters
  tradeHistoryFilters?: TradeHistoryFilters
  enabled?: boolean
}

const PAGE_SIZE = 50

export function useTradeHistory(options: TradeHistoryOptions = {}) {
  const { orderBookFilters: passedOrderBookFilters, tradeHistoryFilters: passedThFilters, enabled = true } = options
  const { filters: internalThFilters } = useTradeHistoryFilters()
  const { network } = useNetwork()
  const { data: walletData } = useWalletAddress()
  const walletAddress = walletData?.address
  const { myTrades } = useMyTrades({})

  const orderBookFilters = passedOrderBookFilters
  const thFilters = passedThFilters ?? internalThFilters

  const { targetRequested, targetOffered, hasPairFilter } = useMemo(() => {
    const buy = orderBookFilters?.buyAsset?.[0]
    const sell = orderBookFilters?.sellAsset?.[0]
    const req = buy ? normalizeTickerForApi(buy, network) : undefined
    const off = sell ? normalizeTickerForApi(sell, network) : undefined
    return { targetRequested: req, targetOffered: off, hasPairFilter: !!(req || off) }
  }, [orderBookFilters?.buyAsset, orderBookFilters?.sellAsset, network])

  const ourIdsQuery = useQuery({
    queryKey: ['our-dexie-offer-ids', walletAddress ?? '', network],
    queryFn: () => offerStorageService.getOurDexieOfferIds(walletAddress!, network),
    enabled: !!walletAddress,
    staleTime: 60 * 1000,
  })

  const myOfferIdsQuery = useQuery({
    queryKey: ['my-offer-ids', walletAddress ?? '', network],
    queryFn: () => offerStorageService.getMyOfferIds(walletAddress!, network),
    enabled: !!walletAddress,
    staleTime: 60 * 1000,
  })

  const ourOfferIds = useMemo(() => {
    const fromDexieOurIds = ourIdsQuery.data ?? new Set<string>()
    const fromMyOfferIds = myOfferIdsQuery.data ?? new Set<string>()
    const fromMy = myTrades.map((t) => t.trade_id).filter(Boolean)
    return new Set([...fromDexieOurIds, ...fromMyOfferIds, ...fromMy])
  }, [ourIdsQuery.data, myOfferIdsQuery.data, myTrades])

  const baseEnabled = enabled && hasPairFilter && (!thFilters.myTradesOnly || !!walletAddress)
  const dexieUrl = getDexieApiUrl(network)
  const fetchOpts = { targetRequested, targetOffered, myTradesOnly: thFilters.myTradesOnly, walletAddress }

  const completedQuery = useInfiniteQuery({
    queryKey: ['trade-history', 'completed', network, targetRequested ?? '', targetOffered ?? '', thFilters.myTradesOnly, walletAddress ?? ''],
    queryFn: ({ pageParam }) =>
      fetchOffersForStatus(dexieUrl, { ...fetchOpts, status: 4, sort: 'date_completed', pageParam: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _all, lastParam) =>
      lastPage.length >= PAGE_SIZE ? (lastParam as number) + 1 : undefined,
    enabled: baseEnabled && thFilters.showCompleted,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
  })

  const cancelledQuery = useInfiniteQuery({
    queryKey: ['trade-history', 'cancelled', network, targetRequested ?? '', targetOffered ?? '', thFilters.myTradesOnly, walletAddress ?? ''],
    queryFn: ({ pageParam }) =>
      fetchOffersForStatus(dexieUrl, { ...fetchOpts, status: 3, sort: 'date_found', pageParam: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _all, lastParam) =>
      lastPage.length >= PAGE_SIZE ? (lastParam as number) + 1 : undefined,
    enabled: baseEnabled && thFilters.showCancelled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
  })

  const pendingQuery = useInfiniteQuery({
    queryKey: ['trade-history', 'pending', network, targetRequested ?? '', targetOffered ?? '', thFilters.myTradesOnly, walletAddress ?? ''],
    queryFn: ({ pageParam }) =>
      fetchOffersForStatus(dexieUrl, { ...fetchOpts, status: 2, sort: 'date_found', pageParam: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _all, lastParam) =>
      lastPage.length >= PAGE_SIZE ? (lastParam as number) + 1 : undefined,
    enabled: baseEnabled && thFilters.showPending,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
  })

  const { orderBookData, orderBookLoading, orderBookError } = useOrderBook(thFilters.showOpen ? orderBookFilters : undefined)

  const openOffers = useMemo(() => {
    if (!orderBookData?.length) return []
    return orderBookData.map((order) => ({
      id: order.id,
      requested: order.requesting,
      offered: order.offering,
      maker: order.maker,
      date_found: order.date_found,
    } as unknown as DexieOffer))
  }, [orderBookData])

  const isOfferMine = useCallback((offer: DexieOffer) => {
    return ourOfferIds.has(offer.id) || !!(offer.maker && walletAddress && offer.maker.toLowerCase() === walletAddress.toLowerCase())
  }, [ourOfferIds, walletAddress])

  const historyOffers = useMemo(() => 
    mergeStatusOffers(
      [
        { show: thFilters.showCompleted, pages: completedQuery.data?.pages, offerState: 'Completed' },
        { show: thFilters.showCancelled, pages: cancelledQuery.data?.pages, offerState: 'Cancelled' },
        { show: thFilters.showPending, pages: pendingQuery.data?.pages, offerState: 'Pending' },
      ],
      isOfferMine
    ),
    [thFilters.showCompleted, thFilters.showCancelled, thFilters.showPending, completedQuery.data?.pages, cancelledQuery.data?.pages, pendingQuery.data?.pages, isOfferMine]
  )

  const openItems = useMemo(() => {
    return thFilters.showOpen ? openOffers.map(o => ({ offer: o, offerState: 'Open' as OfferState, isMyOffer: isOfferMine(o) })) : []
  }, [thFilters.showOpen, openOffers, isOfferMine])

  const offers = useMemo(() => {
    const allOffers = [...openItems, ...historyOffers]
    return thFilters.myTradesOnly ? allOffers.filter(item => item.isMyOffer) : allOffers
  }, [openItems, historyOffers, thFilters.myTradesOnly])

  const fetchNextPage = useCallback(() => {
    if (thFilters.showCompleted) completedQuery.fetchNextPage()
    if (thFilters.showCancelled) cancelledQuery.fetchNextPage()
    if (thFilters.showPending) pendingQuery.fetchNextPage()
  }, [thFilters.showCompleted, thFilters.showCancelled, thFilters.showPending, completedQuery, cancelledQuery, pendingQuery])

  const hasNextPage = buildNextPageState(thFilters, !!completedQuery.hasNextPage, !!cancelledQuery.hasNextPage, !!pendingQuery.hasNextPage)
  const isFetchingNextPage = buildIsFetching(completedQuery.isFetchingNextPage, cancelledQuery.isFetchingNextPage, pendingQuery.isFetchingNextPage)
  const isLoading = buildLoadingState(thFilters, completedQuery.isLoading, cancelledQuery.isLoading, pendingQuery.isLoading, orderBookLoading)
  const error = completedQuery.error ?? cancelledQuery.error ?? pendingQuery.error ?? orderBookError

  return { offers, isLoading, error, hasPairFilter, fetchNextPage, hasNextPage, isFetchingNextPage }
}
