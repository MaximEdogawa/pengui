import type { TibetQuote } from "./tibetTypes";

/**
 * Compute price impact from real quote data (reserves and amounts).
 * Uses the pool state returned by the Tibet quote API: spot price vs execution price.
 *
 * Formula (constant-product AMM):
 * - Spot price (output per unit input) = output_reserve / input_reserve
 * - After swap: new_price = (output_reserve - amount_out) / (input_reserve + amount_in)
 * - Price impact % = (spot_price - new_price) / spot_price * 100
 *   (positive = price moved against you / slippage)
 */
export function computePriceImpactPercent(quote: TibetQuote): number | null {
  const { amount_in, amount_out, input_reserve, output_reserve } = quote;
  if (
    input_reserve <= 0 ||
    output_reserve <= 0 ||
    amount_in <= 0 ||
    amount_out <= 0
  ) {
    return null;
  }
  const spotPrice = output_reserve / input_reserve;
  const newOutputReserve = output_reserve - amount_out;
  const newInputReserve = input_reserve + amount_in;
  if (newInputReserve <= 0) return null;
  const newPrice = newOutputReserve / newInputReserve;
  const impact = ((spotPrice - newPrice) / spotPrice) * 100;
  return Number.isFinite(impact) ? impact : null;
}
