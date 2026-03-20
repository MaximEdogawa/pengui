import { convertToSmallestUnit, mojosToXch } from "@/shared/lib/utils/chia-units";
import type { TibetApiPair } from "./tibetTypes";

export const TOKEN_SMALLEST_PER_UNIT = 1000;

export function formatSwapPrice(xchPerToken: number): string {
  if (xchPerToken >= 1) return xchPerToken.toFixed(4);
  if (xchPerToken >= 0.0001) return xchPerToken.toFixed(8);
  return xchPerToken.toExponential(4);
}

/** Estimate XCH and token received when removing lpAmount (display units) of LP from pair */
export function removeReceiveEstimate(
  pair: TibetApiPair,
  lpDisplay: number,
): { xch: number; token: number } | null {
  if (lpDisplay <= 0 || pair.liquidity <= 0) return null;
  const lpSmallest = lpDisplay * TOKEN_SMALLEST_PER_UNIT;
  const share = lpSmallest / pair.liquidity;
  const xchMojos = pair.xch_reserve * share;
  const tokenSmallest = pair.token_reserve * share;
  return {
    xch: mojosToXch(Math.round(xchMojos)),
    token: Math.round(tokenSmallest) / TOKEN_SMALLEST_PER_UNIT,
  };
}

/** LP amount (smallest units) to remove to receive given XCH and token (display units); amounts must match pool ratio */
export function lpToRemoveFromDesiredOutput(
  pair: TibetApiPair,
  xchDisplay: number,
  tokenDisplay: number,
): number | null {
  if (pair.liquidity <= 0 || pair.xch_reserve <= 0 || pair.token_reserve <= 0)
    return null;
  const xchMojos = Math.round(convertToSmallestUnit(xchDisplay, "xch"));
  const tokenSmallest = Math.round(convertToSmallestUnit(tokenDisplay, "cat"));
  if (xchMojos <= 0 && tokenSmallest <= 0) return null;
  const shareFromXch = xchMojos / pair.xch_reserve;
  const shareFromToken = tokenSmallest / pair.token_reserve;
  const share = Math.min(shareFromXch, shareFromToken);
  if (share <= 0) return null;
  return Math.floor(share * pair.liquidity);
}
