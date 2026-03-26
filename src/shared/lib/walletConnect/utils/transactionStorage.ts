/**
 * Local storage utility for transaction history
 * Since wallet doesn't provide transaction history API, we store sent transactions locally
 */

import { logger } from "@/shared/lib/logger";

export type StoredTransactionType = "send" | "receive" | "trade" | "swap" | "loan" | "options";

export interface StoredTransaction {
  id: string;
  transactionId: string;
  timestamp: number;
  type: StoredTransactionType;
  amount: string;
  fee: string;
  recipientAddress?: string;
  senderAddress?: string;
  memo?: string;
  status: "pending" | "confirmed" | "failed";
  /** Asset ID (empty or 'xch' for native XCH). Optional for backward compatibility. */
  assetId?: string;
  /** USD value at time of transaction, for display. */
  usdValueAtTime?: number;
  /** Asset ticker/symbol for display (e.g. 'XCH', 'USDT'). */
  amountAsset?: string;
}

const STORAGE_KEY = "wallet_transactions";
const MAX_TRANSACTIONS = 50;

export function saveTransaction(transaction: Omit<StoredTransaction, "id" | "timestamp">): void {
  if (typeof window === "undefined") return;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const transactions: StoredTransaction[] = stored ? JSON.parse(stored) : [];

    const newTransaction: StoredTransaction = {
      ...transaction,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    transactions.unshift(newTransaction); // Add to beginning
    const limited = transactions.slice(0, MAX_TRANSACTIONS); // Keep only recent transactions

    localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
  } catch (error) {
    logger.error("Failed to save transaction:", error);
  }
}

export function getTransactions(): StoredTransaction[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    logger.error("Failed to get transactions:", error);
    return [];
  }
}

/** Normalize asset id for comparison: XCH native is '' or 'xch'. */
export function normalizeAssetIdForFilter(assetId: string | undefined): string {
  if (assetId == null || assetId === "") return "xch";
  return assetId;
}

/**
 * Returns transactions that match the given asset (XCH slug or asset ID).
 */
export function getTransactionsByAsset(
  transactions: StoredTransaction[],
  assetIdOrSlug: string
): StoredTransaction[] {
  const normalized = normalizeAssetIdForFilter(assetIdOrSlug === "xch" ? "" : assetIdOrSlug);
  return transactions.filter((tx) => normalizeAssetIdForFilter(tx.assetId) === normalized);
}

export function clearTransactions(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    logger.error("Failed to clear transactions:", error);
  }
}
