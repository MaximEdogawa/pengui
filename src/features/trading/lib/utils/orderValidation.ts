import type { OrderBookOrder } from '../orderBookTypes'
import type { Asset } from './assetUtils'

/**
 * Check if the same asset appears on both sides of an order
 */
export function hasSameAssetOnBothSides(
  order: OrderBookOrder,
  areAssetsEqualFn: (asset1: Asset, asset2: Asset) => boolean
): boolean {
  return order.offering.some((offeringAsset) =>
    order.requesting.some((requestingAsset) => areAssetsEqualFn(offeringAsset, requestingAsset))
  )
}
