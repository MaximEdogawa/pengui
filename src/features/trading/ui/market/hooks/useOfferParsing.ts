'use client'

import {  type OfferAsset } from '@/entities/offer'
import { useDexieDataService } from '@/features/offers/api/useDexieDataService'
import type { DexieOffer } from '@/features/offers/lib/dexieTypes'
import { useOfferInspection } from '@/features/offers/model/useOfferInspection'
import { useCatTokens } from '@/shared/hooks'
import { useNetwork } from '@/shared/hooks/useNetwork'
import { logger } from '@/shared/lib/logger'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { OrderBookOrder } from '../../../lib/orderBookTypes'
import { convertDexieOfferToAppOffer, enrichAssets, processOfferData } from '../utils/offerUtils'

interface UseOfferParsingProps {
  order?: OrderBookOrder
  offerString: string
}

export function useOfferParsing({ order, offerString }: UseOfferParsingProps) {
  const { network } = useNetwork()
  const { postOffer } = useOfferInspection()
  const { getCatTokenInfo } = useCatTokens()
  const dexieDataService = useDexieDataService()
  const queryClient = useQueryClient()

  const isParsingRef = useRef(false)
  const lastParsedOfferRef = useRef<string>('')
  const postOfferRef = useRef(postOffer)
  const getCatTokenInfoRef = useRef(getCatTokenInfo)

  useEffect(() => {
    postOfferRef.current = postOffer
    getCatTokenInfoRef.current = getCatTokenInfo
  }, [postOffer, getCatTokenInfo])

  // Get cached data immediately for instant UI updates
  const cachedOrderData = useMemo(() => {
    if (!order?.id) return null
    const cached = queryClient.getQueryData<{
      orderId: string
      offerString: string
      fullMakerAddress: string
      offer: DexieOffer
    }>(['orderBookDetails', order.id, network])

    if (cached) {
      return {
        offerString: cached.offerString,
        fullMakerAddress: cached.fullMakerAddress,
        offer: cached.offer,
      }
    }
    return null
  }, [order?.id, queryClient, network])

  // Pre-populate offer preview from cached data immediately
  const [offerPreview, setOfferPreview] = useState<{
    assetsOffered?: OfferAsset[]
    assetsRequested?: OfferAsset[]
    creatorAddress?: string
    fee?: number
    status?: string
    dexieStatus?: string
  } | null>(null)
  const [parseError, setParseError] = useState('')

  useEffect(() => {
    const populateFromCache = async () => {
      if (!cachedOrderData?.offer || !order?.id) return

      if (lastParsedOfferRef.current === cachedOrderData.offerString) {
        return
      }

      if (isParsingRef.current) return
      isParsingRef.current = true

      try {
        const appOffer = convertDexieOfferToAppOffer({
          success: true,
          id: cachedOrderData.offer.id || '',
          known: true,
          offer: cachedOrderData.offer,
        })

        const enrichedAssetsOffered = await enrichAssets(appOffer.assetsOffered, getCatTokenInfoRef.current)
        const enrichedAssetsRequested = await enrichAssets(appOffer.assetsRequested, getCatTokenInfoRef.current)

        setOfferPreview({
          assetsOffered: enrichedAssetsOffered,
          assetsRequested: enrichedAssetsRequested,
          creatorAddress: appOffer.creatorAddress,
          fee: appOffer.fee,
          status: appOffer.status,
          dexieStatus: appOffer.dexieStatus,
        })
        lastParsedOfferRef.current = cachedOrderData.offerString
        setParseError('')
      } catch (error) {
        logger.error('Error processing cached offer data:', error)
      } finally {
        isParsingRef.current = false
      }
    }

    populateFromCache()
  }, [cachedOrderData?.offer, cachedOrderData?.offerString, order?.id])

  // Use TanStack Query to fetch offer details
  const offerDetailsQuery = useQuery<{
    offerString: string
    fullMakerAddress: string
    offer: DexieOffer
  } | null>({
    queryKey: ['orderBookDetails', order?.id, network],
    queryFn: async () => {
      if (!order?.id) return null
      const response = await dexieDataService.inspectOffer(order.id)
      if (response.success && response.offer) {
        return {
          offerString: response.offer.offer || '',
          fullMakerAddress: response.offer.id || '',
          offer: response.offer,
        }
      }
      throw new Error(response?.error_message || 'Failed to fetch offer details')
    },
    enabled: !!order?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
    initialData: cachedOrderData || undefined,
    placeholderData: (previousData) => {
      if (cachedOrderData) return cachedOrderData
      return previousData
    },
    refetchOnMount: !cachedOrderData,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const fetchedOfferString =
    offerDetailsQuery.data?.offerString || cachedOrderData?.offerString || ''
  const isLoadingOfferString =
    offerDetailsQuery.isLoading && !offerDetailsQuery.data && !cachedOrderData

  // Parse offer when string changes or when we have offer data from query
  useEffect(() => {
    const parseOffer = async () => {
      const offerData = offerDetailsQuery.data?.offer
      const trimmedOffer = offerString.trim()

      if (!trimmedOffer || isParsingRef.current || lastParsedOfferRef.current === trimmedOffer) {
        return
      }

      isParsingRef.current = true
      lastParsedOfferRef.current = trimmedOffer
      setParseError('')

      const result = await processOfferData(
        offerData,
        trimmedOffer,
        getCatTokenInfoRef.current,
        offerData ? undefined : postOfferRef.current
      )

      setOfferPreview(result.preview)
      setParseError(result.error)
      if (result.error && !result.error.includes('validated')) {
        lastParsedOfferRef.current = ''
      }
      isParsingRef.current = false
    }

    if (cachedOrderData?.offer && lastParsedOfferRef.current === cachedOrderData.offerString) {
      return
    }

    const timeoutId = setTimeout(() => {
      parseOffer()
    }, 200)

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      isParsingRef.current = false
    }
  }, [
    offerString,
    order?.id,
    fetchedOfferString,
    offerDetailsQuery.data?.offer,
    cachedOrderData,
  ])

  return {
    offerPreview,
    parseError,
    fetchedOfferString,
    isLoadingOfferString,
    offerDetailsQuery,
  }
}
