import { convertOfferStateToStatus, type OfferAsset } from '@/entities/offer'
import type { DexieOffer, DexiePostOfferResponse } from '@/features/offers/lib/dexieTypes'
import { calculateOfferState } from '@/features/offers/lib/dexieUtils'
import { logger } from '@/shared/lib/logger'
import { validateOfferString } from '@/shared/lib/utils/offerUtils'

/**
 * Convert Dexie offer to app offer format
 */
export function convertDexieOfferToAppOffer(dexieResponse: DexiePostOfferResponse): {
  assetsOffered: OfferAsset[]
  assetsRequested: OfferAsset[]
  creatorAddress?: string
  fee: number
  status: string
  dexieStatus: string
} {
  if (!dexieResponse.offer) {
    return {
      assetsOffered: [],
      assetsRequested: [],
      fee: 0,
      status: 'unknown',
      dexieStatus: 'Unknown',
    }
  }

  const offer = dexieResponse.offer
  const calculatedState = calculateOfferState(offer)

  // Convert Dexie assets to app assets
  const assetsOffered: OfferAsset[] = (offer.offered || []).map((asset) => {
    const isXch = !asset.id || asset.id === 'XCH'
    return {
      amount: asset.amount,
      assetId: isXch ? '' : asset.id,
      type: (isXch ? 'xch' : 'cat') as 'xch' | 'cat',
      symbol: asset.code || undefined,
    }
  })

  const assetsRequested: OfferAsset[] = (offer.requested || []).map((asset) => {
    const isXch = !asset.id || asset.id === 'XCH'
    return {
      amount: asset.amount,
      assetId: isXch ? '' : asset.id,
      type: (isXch ? 'xch' : 'cat') as 'xch' | 'cat',
      symbol: asset.code || undefined,
    }
  })

  return {
    assetsOffered,
    assetsRequested,
    creatorAddress: undefined,
    fee: offer.fees ? offer.fees / 1_000_000_000_000 : 0,
    status: convertOfferStateToStatus(calculatedState),
    dexieStatus: calculatedState,
  }
}

/**
 * Enrich assets with ticker symbols
 */
export async function enrichAssets(
  assets: OfferAsset[],
  getCatTokenInfo: (assetId: string) => Promise<{ ticker?: string } | undefined> | { ticker?: string } | undefined
): Promise<OfferAsset[]> {
  return Promise.all(
    assets.map(async (asset) => {
      if (asset.assetId) {
        const tickerInfo = await getCatTokenInfo(asset.assetId)
        return { ...asset, symbol: tickerInfo?.ticker || undefined }
      }
      return asset
    })
  )
}

/**
 * Process offer data and return preview
 */
export async function processOfferData(
  offerData: DexieOffer | undefined,
  offerString: string,
  getCatTokenInfo: (assetId: string) => Promise<{ ticker?: string } | undefined> | { ticker?: string } | undefined,
  postOfferFn?: (params: { offer: string; drop_only: boolean; claim_rewards: boolean }) => Promise<DexiePostOfferResponse>
): Promise<{
  preview: {
    assetsOffered: OfferAsset[]
    assetsRequested: OfferAsset[]
    creatorAddress?: string
    fee?: number
    status?: string
    dexieStatus?: string
  } | null
  error: string
}> {
  if (offerData) {
    try {
      const appOffer = convertDexieOfferToAppOffer({
        success: true,
        id: offerData.id || '',
        known: true,
        offer: offerData,
      })
      const enrichedAssetsOffered = await enrichAssets(appOffer.assetsOffered, getCatTokenInfo)
      const enrichedAssetsRequested = await enrichAssets(appOffer.assetsRequested, getCatTokenInfo)
      return {
        preview: {
          assetsOffered: enrichedAssetsOffered,
          assetsRequested: enrichedAssetsRequested,
          creatorAddress: appOffer.creatorAddress,
          fee: appOffer.fee,
          status: appOffer.status,
          dexieStatus: appOffer.dexieStatus,
        },
        error: '',
      }
    } catch (error) {
      logger.error('Error processing offer data:', error)
      return { preview: null, error: 'Error processing offer data' }
    }
  }

  if (!validateOfferString(offerString)) {
    return { preview: null, error: 'Invalid offer string format' }
  }

  if (!postOfferFn) {
    return { preview: null, error: 'Post offer function not available' }
  }

  try {
    const postResponse = await postOfferFn({
      offer: offerString,
      drop_only: false,
      claim_rewards: false,
    })

    if (postResponse?.success && postResponse.offer) {
      const appOffer = convertDexieOfferToAppOffer(postResponse)
      const enrichedAssetsOffered = await enrichAssets(appOffer.assetsOffered, getCatTokenInfo)
      const enrichedAssetsRequested = await enrichAssets(appOffer.assetsRequested, getCatTokenInfo)
      return {
        preview: {
          assetsOffered: enrichedAssetsOffered,
          assetsRequested: enrichedAssetsRequested,
          creatorAddress: appOffer.creatorAddress,
          fee: appOffer.fee,
          status: appOffer.status,
          dexieStatus: appOffer.dexieStatus,
        },
        error: '',
      }
    }

    if (postResponse?.success && postResponse.id) {
      return {
        preview: {
          assetsOffered: [],
          assetsRequested: [],
          creatorAddress: undefined,
          fee: undefined,
        },
        error: 'Offer string validated - details will be confirmed by wallet',
      }
    }
  } catch {
    return { preview: null, error: 'Error inspecting offer on Dexie marketplace' }
  }

  return { preview: null, error: 'Failed to process offer' }
}
