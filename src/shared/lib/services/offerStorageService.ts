import {
  db,
  type StoredOffer,
  ensureDatabaseReady,
  isDatabaseReady,
  withTimeout,
} from '@/shared/lib/database/indexedDB'
import type { OfferDetails } from '@/entities/offer'
import { logger } from '@/shared/lib/logger'
import { getStoredNetwork } from '@/shared/lib/utils/networkStorage'
import { filterOffersByNetwork } from '@/shared/lib/utils/offerNetworkFilter'

export interface OfferStorageOptions {
  walletAddress?: string
  includeLocal?: boolean
  includeSynced?: boolean
  status?: string
  page?: number
  pageSize?: number
  network?: 'mainnet' | 'testnet' // Filter by network (defaults to current network from localStorage)
}

export interface PaginatedOffersResult {
  offers: StoredOffer[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export class OfferStorageService {
  /**
   * Get current network from parameter or localStorage
   * @param network - Optional network parameter
   * @returns The network to use
   */
  private getCurrentNetwork(network?: 'mainnet' | 'testnet'): 'mainnet' | 'testnet' {
    return network || getStoredNetwork('mainnet')
  }

  /**
   * Save an offer to IndexedDB
   */
  async saveOffer(
    offer: OfferDetails,
    isLocal: boolean = true,
    walletAddress?: string
  ): Promise<StoredOffer> {
    try {
      await ensureDatabaseReady()

      if (!isDatabaseReady()) {
        throw new Error('Database is not ready')
      }

      // Check if offer already exists
      const existingOffer = await withTimeout(
        db.offers.where('id').equals(offer.id).first(),
        5000,
        'saveOffer (check existing)'
      )

      if (existingOffer) {
        logger.info('⚠️ Offer already exists, updating instead of creating:', { offerId: offer.id })
        // Update existing offer instead of creating duplicate
        await this.updateOffer(offer.id, offer)
        return { ...existingOffer, ...offer, id: offer.id }
      }

      // Get current network from localStorage (defaults to mainnet)
      const currentNetwork = this.getCurrentNetwork()

      const storedOffer: StoredOffer = {
        ...offer,
        lastModified: new Date(),
        isLocal,
        walletAddress: walletAddress || this.getCurrentWalletAddress(),
        syncedAt: isLocal ? undefined : new Date(),
        network: currentNetwork,
      }

      await withTimeout(db.offers.add(storedOffer), 5000, 'saveOffer (add)')
      logger.info('✅ Offer saved to IndexedDB:', { offerId: offer.id, tradeId: offer.tradeId })

      // Return the stored offer with the original offer ID
      return { ...storedOffer, id: offer.id }
    } catch (error) {
      logger.error('❌ Failed to save offer to IndexedDB:', error)
      throw error
    }
  }

  /**
   * Update an existing offer
   */
  async updateOffer(offerId: string, updates: Partial<OfferDetails>): Promise<void> {
    try {
      await ensureDatabaseReady()

      if (!isDatabaseReady()) {
        throw new Error('Database is not ready')
      }

      const updateData: Partial<StoredOffer> = {
        ...updates,
        lastModified: new Date(),
      }

      // Update by the offerId field (not the auto-generated primary key)
      const updatedCount = await withTimeout(
        db.offers.where('id').equals(offerId).modify(updateData),
        5000,
        'updateOffer'
      )

      if (updatedCount === 0) {
        throw new Error(`No offer found with ID: ${offerId}`)
      }

      logger.info('✅ Offer updated in IndexedDB:', { offerId, updates, updatedCount })
    } catch (error) {
      logger.error('❌ Failed to update offer in IndexedDB:', error)
      throw error
    }
  }

  /**
   * Remove a single duplicate offer
   */
  private async removeDuplicateOffer(
    offerId: string,
    duplicate: StoredOffer
  ): Promise<void> {
    const storedOffer = await withTimeout(
      db.offers.where('tradeId').equals(duplicate.tradeId).first(),
      5000,
      'removeDuplicates (find duplicate)'
    )
    if (!storedOffer || typeof storedOffer.id !== 'number') {
      return
    }
    await withTimeout(db.offers.delete(storedOffer.id), 5000, 'removeDuplicates (delete)')
    logger.info('🗑️ Removed duplicate offer:', { offerId, duplicateId: duplicate.id })
  }

  /**
   * Remove duplicate offers (keep the most recent one)
   * Note: This is now a manual operation and not called automatically
   */
  async removeDuplicates(): Promise<void> {
    try {
      await ensureDatabaseReady()

      if (!isDatabaseReady()) {
        throw new Error('Database is not ready')
      }

      const allOffers = await withTimeout(db.offers.toArray(), 10000, 'removeDuplicates')
      const offerGroups = new Map<string, StoredOffer[]>()

      // Group offers by their ID
      allOffers.forEach((offer) => {
        if (!offerGroups.has(offer.id)) {
          offerGroups.set(offer.id, [])
        }
        offerGroups.get(offer.id)!.push(offer)
      })

      // Remove duplicates, keeping the most recent
      for (const [offerId, offers] of offerGroups) {
        if (offers.length <= 1) {
          continue
        }
        // Sort by lastModified, keep the most recent
        offers.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
        const duplicatesToRemove = offers.slice(1)

        // Remove duplicates
        for (const duplicate of duplicatesToRemove) {
          await this.removeDuplicateOffer(offerId, duplicate)
        }
      }
    } catch (error) {
      logger.error('❌ Failed to remove duplicates:', error)
      throw error
    }
  }

  /**
   * Get all offers with optional filtering and pagination
   */
  async getOffers(
    options: OfferStorageOptions = {}
  ): Promise<StoredOffer[] | PaginatedOffersResult> {
    try {
      await ensureDatabaseReady()

      if (!isDatabaseReady()) {
        throw new Error('Database is not ready')
      }

      // Get current network from options or localStorage (defaults to mainnet)
      const network = this.getCurrentNetwork(options.network)

      // Fetch all offers first, then apply filters (more efficient than chained Dexie filters)
      let allOffers = await withTimeout(
        db.offers.orderBy('createdAt').reverse().toArray(),
        5000,
        'getOffers (fetch)'
      )

      // Filter by network first
      allOffers = filterOffersByNetwork(allOffers, network)

      // Apply additional filters
      if (options.status) {
        allOffers = allOffers.filter((offer) => offer.status === options.status)
      }

      if (options.walletAddress) {
        allOffers = allOffers.filter((offer) => offer.walletAddress === options.walletAddress)
      }

      if (options.includeLocal === false) {
        allOffers = allOffers.filter((offer) => !offer.isLocal)
      }
      if (options.includeSynced === false) {
        allOffers = allOffers.filter((offer) => offer.isLocal)
      }

      // If pagination is requested, return paginated result
      if (options.page !== undefined && options.pageSize !== undefined) {
        const page = Math.max(1, options.page)
        const pageSize = Math.max(1, options.pageSize)
        const offset = (page - 1) * pageSize

        // Get total count (already filtered)
        const total = allOffers.length
        const totalPages = Math.ceil(total / pageSize)

        // Get paginated offers
        const offers = allOffers.slice(offset, offset + pageSize)

        logger.info('✅ Retrieved paginated offers from IndexedDB:', {
          count: offers.length,
          page,
          pageSize,
          total,
          totalPages,
        })

        return {
          offers,
          total,
          page,
          pageSize,
          totalPages,
        }
      }

      // No pagination - return all offers
      logger.info('✅ Retrieved offers from IndexedDB:', { count: allOffers.length })

      return allOffers
    } catch (error) {
      logger.error('❌ Failed to get offers from IndexedDB:', error)
      // Return empty result instead of throwing to prevent UI crashes
      if (options.page !== undefined && options.pageSize !== undefined) {
        return {
          offers: [],
          total: 0,
          page: options.page || 1,
          pageSize: options.pageSize || 10,
          totalPages: 0,
        }
      }
      return []
    }
  }

  /**
   * Get offers by status
   */
  async getOffersByStatus(
    status: string,
    walletAddress?: string,
    network?: 'mainnet' | 'testnet'
  ): Promise<StoredOffer[]> {
    try {
      await ensureDatabaseReady()

      if (!isDatabaseReady()) {
        return []
      }

      // Get current network from parameter or localStorage (defaults to mainnet)
      const currentNetwork = this.getCurrentNetwork(network)

      let query = db.offers.where('status').equals(status)

      if (walletAddress) {
        query = query.and((offer) => offer.walletAddress === walletAddress)
      }

      // Get all offers first, then filter by network
      const allOffers = await withTimeout(
        query.reverse().sortBy('createdAt'),
        5000,
        'getOffersByStatus'
      )

      // Filter by network
      const offers = filterOffersByNetwork(allOffers, currentNetwork)
      logger.info('✅ Retrieved offers by status from IndexedDB:', { status, count: offers.length })

      return offers
    } catch (error) {
      logger.error('❌ Failed to get offers by status from IndexedDB:', error)
      return [] // Return empty array instead of throwing
    }
  }

  /**
   * Get a specific offer by trade ID
   */
  async getOfferByTradeId(tradeId: string): Promise<StoredOffer | undefined> {
    try {
      await ensureDatabaseReady()

      if (!isDatabaseReady()) {
        return undefined
      }

      const offer = await withTimeout(
        db.offers.where('tradeId').equals(tradeId).first(),
        5000,
        'getOfferByTradeId'
      )
      logger.info('✅ Retrieved offer by trade ID from IndexedDB:', { tradeId, found: !!offer })

      return offer
    } catch (error) {
      logger.error('❌ Failed to get offer by trade ID from IndexedDB:', error)
      return undefined // Return undefined instead of throwing
    }
  }

  /**
   * Delete an offer
   */
  async deleteOffer(offerId: string): Promise<void> {
    try {
      await ensureDatabaseReady()

      if (!isDatabaseReady()) {
        throw new Error('Database is not ready')
      }

      const deletedCount = await withTimeout(
        db.offers.where('id').equals(offerId).delete(),
        5000,
        'deleteOffer'
      )

      if (deletedCount === 0) {
        throw new Error(`No offer found with ID: ${offerId}`)
      }

      logger.info('✅ Offer deleted from IndexedDB:', { offerId, deletedCount })
    } catch (error) {
      logger.error('❌ Failed to delete offer from IndexedDB:', error)
      throw error
    }
  }

  /**
   * Mark offers as synced
   */
  async markOffersAsSynced(offerIds: string[]): Promise<void> {
    try {
      await ensureDatabaseReady()

      if (!isDatabaseReady()) {
        throw new Error('Database is not ready')
      }

      for (const id of offerIds) {
        await withTimeout(
          db.offers.where('id').equals(id).modify({
            isLocal: false,
            syncedAt: new Date(),
            lastModified: new Date(),
          }),
          5000,
          'markOffersAsSynced'
        )
      }
      logger.info('✅ Offers marked as synced in IndexedDB:', { count: offerIds.length })
    } catch (error) {
      logger.error('❌ Failed to mark offers as synced in IndexedDB:', error)
      throw error
    }
  }

  /**
   * Get unsynced offers
   */
  async getUnsyncedOffers(network?: 'mainnet' | 'testnet'): Promise<StoredOffer[]> {
    try {
      await ensureDatabaseReady()

      if (!isDatabaseReady()) {
        return []
      }

      // Get current network from parameter or localStorage (defaults to mainnet)
      const currentNetwork = this.getCurrentNetwork(network)

      // Get all offers that are local (not synced)
      const allOffers = await withTimeout(
        db.offers.filter((offer) => offer.isLocal === true).toArray(),
        5000,
        'getUnsyncedOffers'
      )

      // Filter by network
      const offers = filterOffersByNetwork(allOffers, currentNetwork)

      logger.info('✅ Retrieved unsynced offers from IndexedDB:', { count: offers.length })

      return offers
    } catch (error) {
      logger.error('❌ Failed to get unsynced offers from IndexedDB:', error)
      return [] // Return empty array instead of throwing
    }
  }

  /**
   * Clear all offers
   */
  async clearAllOffers(): Promise<void> {
    try {
      await ensureDatabaseReady()

      if (!isDatabaseReady()) {
        throw new Error('Database is not ready')
      }

      await withTimeout(db.offers.clear(), 10000, 'clearAllOffers')
      logger.info('✅ All offers cleared from IndexedDB')
    } catch (error) {
      logger.error('❌ Failed to clear offers from IndexedDB:', error)
      throw error
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    totalOffers: number
    localOffers: number
    syncedOffers: number
    statusBreakdown: Record<string, number>
  }> {
    try {
      await ensureDatabaseReady()

      if (!isDatabaseReady()) {
        return {
          totalOffers: 0,
          localOffers: 0,
          syncedOffers: 0,
          statusBreakdown: {},
        }
      }

      const allOffers = await withTimeout(db.offers.toArray(), 5000, 'getStats')

      const stats = {
        totalOffers: allOffers.length,
        localOffers: allOffers.filter((o) => o.isLocal).length,
        syncedOffers: allOffers.filter((o) => !o.isLocal).length,
        statusBreakdown: allOffers.reduce(
          (acc, offer) => {
            acc[offer.status] = (acc[offer.status] || 0) + 1
            return acc
          },
          {} as Record<string, number>
        ),
      }

      logger.info('✅ Retrieved database stats:', stats)
      return stats
    } catch (error) {
      logger.error('❌ Failed to get database stats:', error)
      // Return empty stats instead of throwing
      return {
        totalOffers: 0,
        localOffers: 0,
        syncedOffers: 0,
        statusBreakdown: {},
      }
    }
  }

  /**
   * Get current wallet address from session
   * Note: This method should be called with wallet address from React hooks
   */
  private getCurrentWalletAddress(): string | undefined {
    // Return undefined - wallet address should be passed as parameter
    // when calling saveOffer from React components
    return undefined
  }
}

// Create singleton instance
export const offerStorageService = new OfferStorageService()
