import {
  db,
  type StoredOffer,
  ensureDatabaseReady,
  isDatabaseReady,
  withTimeout,
} from "@/shared/lib/database/indexedDB";
import type { OfferDetails } from "@/entities/offer";
import type { DexieHistoricalTrade } from "@/features/offers/lib/dexieTypes";
import { logger } from "@/shared/lib/logger";
import { getStoredNetwork } from "@/shared/lib/utils/networkStorage";
import { getNativeTokenTickerForNetwork } from "@/shared/lib/config/environment";

export interface TradeHistoryItem {
  trade_id: string;
  ticker_id?: string;
  price: number;
  volume: number;
  timestamp: number;
  type: "buy" | "sell";
  symbol: string;
  totalValue: number;
  isMyTrade: boolean;
  entryPrice?: number;
  profitLoss?: number;
  profitLossPercent?: number;
  offerId?: string;
}

export interface MyTradesFilters {
  tickerId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  type?: "buy" | "sell" | "all";
}

export class MyTradesService {
  /**
   * Get current network from localStorage
   */
  private getCurrentNetwork(): "mainnet" | "testnet" {
    return getStoredNetwork();
  }

  /**
   * Get user trades from offers
   * Includes offers created by user and offers taken by user
   */
  async getMyTrades(
    walletAddress: string,
    network?: "mainnet" | "testnet",
    filters?: MyTradesFilters
  ): Promise<TradeHistoryItem[]> {
    try {
      await ensureDatabaseReady();

      if (!isDatabaseReady()) {
        throw new Error("Database is not ready");
      }

      const currentNetwork = network || this.getCurrentNetwork();
      const normalizedWallet = (walletAddress || "").toLowerCase();

      // Get offers where user is creator or taker
      const offers = await withTimeout(
        db.offers
          .where("network")
          .equals(currentNetwork)
          .filter((offer) => {
            // User is creator
            const isCreator =
              (offer.walletAddress || "").toLowerCase() === normalizedWallet ||
              (offer.creatorAddress || "").toLowerCase() === normalizedWallet;
            // User is taker
            const isTaker = (offer.takenBy || "").toLowerCase() === normalizedWallet;
            return isCreator || isTaker;
          })
          .toArray(),
        10000,
        "getMyTrades"
      );

      // Convert offers to trades
      const trades = offers
        .map((offer) => this.convertOfferToTrade(offer, walletAddress))
        .filter((trade): trade is TradeHistoryItem => trade !== null);

      // Apply filters
      let filteredTrades = trades;

      if (filters?.tickerId) {
        filteredTrades = filteredTrades.filter((trade) => trade.ticker_id === filters.tickerId);
      }

      if (filters?.dateFrom) {
        filteredTrades = filteredTrades.filter(
          (trade) => trade.timestamp >= filters.dateFrom!.getTime()
        );
      }

      if (filters?.dateTo) {
        filteredTrades = filteredTrades.filter(
          (trade) => trade.timestamp <= filters.dateTo!.getTime()
        );
      }

      if (filters?.type && filters.type !== "all") {
        filteredTrades = filteredTrades.filter((trade) => trade.type === filters.type);
      }

      // Calculate profit/loss for each trade
      return filteredTrades.map((trade) => {
        const entryPrice = this.getEntryPrice(
          trade.ticker_id || "",
          walletAddress,
          trade.type,
          filteredTrades
        );
        if (entryPrice) {
          const profitLoss = this.calculateProfitLoss(trade, entryPrice);
          return {
            ...trade,
            entryPrice,
            profitLoss: profitLoss.absolute,
            profitLossPercent: profitLoss.percent,
          };
        }
        return trade;
      });
    } catch (error) {
      logger.error("❌ Failed to get my trades:", error);
      return [];
    }
  }

  /**
   * Get trades for specific ticker
   */
  async getMyTradesForTicker(
    tickerId: string,
    walletAddress: string,
    network?: "mainnet" | "testnet"
  ): Promise<TradeHistoryItem[]> {
    return this.getMyTrades(walletAddress, network, { tickerId });
  }

  /**
   * Convert offer to trade format
   */
  convertOfferToTrade(offer: StoredOffer, walletAddress: string): TradeHistoryItem | null {
    try {
      // Need at least one asset on each side
      if (!offer.assetsOffered?.length || !offer.assetsRequested?.length) {
        return null;
      }

      // Get primary assets (first asset on each side)
      const offeredAsset = offer.assetsOffered[0];
      const requestedAsset = offer.assetsRequested[0];

      if (!offeredAsset || !requestedAsset) {
        return null;
      }

      // Calculate price (requested amount / offered amount)
      const price =
        requestedAsset.amount > 0 && offeredAsset.amount > 0
          ? requestedAsset.amount / offeredAsset.amount
          : 0;

      if (price <= 0) {
        return null;
      }

      // Determine trade type based on what user is doing
      // Normalize addresses to lowercase for case-insensitive comparison
      const normalizedWallet = (walletAddress || "").toLowerCase();
      const isCreator =
        (offer.walletAddress || "").toLowerCase() === normalizedWallet ||
        (offer.creatorAddress || "").toLowerCase() === normalizedWallet;
      const isTaker = (offer.takenBy || "").toLowerCase() === normalizedWallet;
      const network = offer.network || this.getCurrentNetwork();

      // Determine trade type using helper
      const tradeType = this.determineTradeType({
        offeredAsset,
        requestedAsset,
        isCreator,
        isTaker,
        network,
      });

      // Use volume from offered asset
      const volume = offeredAsset.amount || 0;
      const totalValue = requestedAsset.amount || 0;

      // Get timestamp (prefer dateCompleted, fallback to createdAt)
      const timestamp = offer.dateCompleted
        ? new Date(offer.dateCompleted).getTime()
        : offer.createdAt.getTime();

      // Get symbol from offered asset
      const symbol = offeredAsset.symbol || offeredAsset.assetId?.slice(0, 8) || "UNKNOWN";

      // Construct ticker ID (simplified - would need proper ticker resolution in production)
      const tickerId = this.constructTickerId(offeredAsset, requestedAsset, network);

      return {
        trade_id: offer.tradeId || offer.id,
        ticker_id: tickerId,
        price,
        volume,
        timestamp,
        type: tradeType,
        symbol,
        totalValue,
        isMyTrade: true,
        offerId: offer.id,
      };
    } catch (error) {
      logger.error("❌ Failed to convert offer to trade:", error);
      return null;
    }
  }

  /**
   * Check if asset is native token
   */
  private isNativeAsset(
    asset: OfferDetails["assetsOffered"][0],
    network: "mainnet" | "testnet"
  ): boolean {
    const nativeTicker = getNativeTokenTickerForNetwork(network).toLowerCase();
    const assetIdLower = asset.assetId?.toLowerCase();
    const isExactXch = assetIdLower === "xch" || /^xch($|[:_-])/i.test(assetIdLower || "");
    return isExactXch || asset.symbol?.toLowerCase() === nativeTicker;
  }

  /**
   * Determine trade type (buy/sell) based on assets and user role
   */
  private determineTradeType(params: {
    offeredAsset: OfferDetails["assetsOffered"][0];
    requestedAsset: OfferDetails["assetsRequested"][0];
    isCreator: boolean;
    isTaker: boolean;
    network: "mainnet" | "testnet";
  }): "buy" | "sell" {
    const { offeredAsset, requestedAsset, isCreator, isTaker, network } = params;
    const offeredIsNative = this.isNativeAsset(offeredAsset, network);
    const requestedIsNative = this.isNativeAsset(requestedAsset, network);

    if (isCreator) {
      // Creator perspective: offering native = selling, requesting native = buying
      return requestedIsNative ? "buy" : offeredIsNative ? "sell" : "buy";
    }

    if (isTaker) {
      // Taker perspective: opposite of creator
      return offeredIsNative ? "buy" : requestedIsNative ? "sell" : "sell";
    }

    // Default to buy if we can't determine
    return "buy";
  }

  /**
   * Construct ticker ID from asset pair
   */
  private constructTickerId(
    offeredAsset: OfferDetails["assetsOffered"][0],
    requestedAsset: OfferDetails["assetsRequested"][0],
    network: "mainnet" | "testnet"
  ): string {
    const normalize = (asset: { assetId?: string; symbol?: string }): string => {
      const identifier = asset.symbol || asset.assetId || "";
      const lower = identifier.toLowerCase();
      // Use same strict matching as isNativeAsset to avoid false positives
      const isExactXch = lower === "xch" || /^xch($|[:_-])/i.test(lower);
      if (isExactXch || lower === "txch") {
        return network === "mainnet" ? "xch" : "txch";
      }
      return lower;
    };

    const base = normalize(offeredAsset);
    const target = normalize(requestedAsset);

    // If base is native, swap them
    if (base === "xch" || base === "txch") {
      return `${target}_${base}`;
    }

    return `${base}_${target}`;
  }

  /**
   * Calculate profit/loss for a trade
   */
  calculateProfitLoss(
    trade: TradeHistoryItem,
    entryPrice: number
  ): { absolute: number; percent: number } {
    if (!entryPrice || entryPrice <= 0) {
      return { absolute: 0, percent: 0 };
    }

    const priceDiff = trade.price - entryPrice;
    const absolute = priceDiff * trade.volume;
    const percent = (priceDiff / entryPrice) * 100;

    return { absolute, percent };
  }

  /**
   * Get entry price (first trade price for asset pair)
   */
  getEntryPrice(
    tickerId: string,
    walletAddress: string,
    tradeType: "buy" | "sell",
    allTrades?: TradeHistoryItem[]
  ): number | null {
    try {
      // If allTrades provided, use it (more efficient)
      if (allTrades) {
        const relevantTrades = allTrades
          .filter((t) => t.ticker_id === tickerId && t.type === tradeType)
          .sort((a, b) => a.timestamp - b.timestamp);

        return relevantTrades.length > 0 ? relevantTrades[0].price : null;
      }

      // Otherwise, fetch from database
      // This is a simplified version - in production you'd want to cache this
      return null;
    } catch (error) {
      logger.error("❌ Failed to get entry price:", error);
      return null;
    }
  }

  /**
   * Identify which trades in a list are user trades
   */
  identifyMyTrades(
    apiTrades: DexieHistoricalTrade[],
    myTrades: TradeHistoryItem[]
  ): Map<string, TradeHistoryItem> {
    const myTradesMap = new Map<string, TradeHistoryItem>();

    // Create a map of my trades by trade_id
    myTrades.forEach((trade) => {
      if (trade.trade_id) {
        myTradesMap.set(trade.trade_id, trade);
      }
    });

    // Match API trades with my trades
    // Note: This is a simplified matching - in production you might need
    // more sophisticated matching based on price, timestamp, volume, etc.
    const matchedTrades = new Map<string, TradeHistoryItem>();

    apiTrades.forEach((apiTrade) => {
      // Try to match by trade_id
      if (apiTrade.trade_id && myTradesMap.has(apiTrade.trade_id)) {
        matchedTrades.set(apiTrade.trade_id, myTradesMap.get(apiTrade.trade_id)!);
        return;
      }

      // Try to match by price and timestamp (within a small window)
      const matchingTrade = Array.from(myTradesMap.values()).find((myTrade) => {
        const priceMatch = Math.abs(myTrade.price - apiTrade.price) < 0.0001;
        const timeMatch =
          myTrade.timestamp && apiTrade.trade_timestamp
            ? Math.abs(myTrade.timestamp - apiTrade.trade_timestamp * 1000) < 60000 // Within 1 minute
            : false;
        return priceMatch && timeMatch;
      });

      if (matchingTrade) {
        matchedTrades.set(apiTrade.trade_id || "", matchingTrade);
      }
    });

    return matchedTrades;
  }
}

// Create singleton instance
export const myTradesService = new MyTradesService();
