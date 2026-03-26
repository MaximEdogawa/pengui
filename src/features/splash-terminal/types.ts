/** Filter state for terminal display and /list */
export interface TerminalFilterParams {
  assetPair?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  amountMin?: number | null;
}

/**
 * Parsed terminal command
 */
export type TerminalCommand =
  | { type: "filter"; sub: "asset"; value: string }
  | { type: "filter"; sub: "price"; min?: number; max?: number }
  | { type: "filter"; sub: "amount"; min: number }
  | { type: "filter"; sub: "clear" }
  | { type: "list"; limit?: number }
  | { type: "watch"; offerId: string }
  | { type: "unwatch"; offerId: string }
  | { type: "status" }
  | { type: "reconnect" }
  | { type: "stats" }
  | { type: "export"; format: "csv" }
  | { type: "clear" }
  | { type: "help" }
  | { type: "unknown"; raw: string };
