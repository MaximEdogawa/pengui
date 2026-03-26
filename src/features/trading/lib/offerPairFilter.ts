import type { DexieOffer } from "@/entities/offer";

/**
 * Check whether an enriched Dexie offer matches the current asset pair filter.
 * Bidirectional: the pair can appear on either side of the offer.
 */
export function offerMatchesPairFilter(
  offer: DexieOffer,
  buyAssets: string[],
  sellAssets: string[]
): boolean {
  // No filter set → show all offers
  if (buyAssets.length === 0 && sellAssets.length === 0) return true;
  // Un-enriched stubs (no decoded assets) can never satisfy a filter
  if (!offer.offered?.length && !offer.requested?.length) return false;

  const norm = (s: string) => {
    const u = s.toUpperCase();
    return u === "TXCH" ? "XCH" : u;
  };

  const offeredCodes = new Set((offer.offered || []).map((a) => norm(a.code ?? "")));
  const requestedCodes = new Set((offer.requested || []).map((a) => norm(a.code ?? "")));

  const nBuy = buyAssets.map(norm);
  const nSell = sellAssets.map(norm);

  // Direction 1: buyAsset in requested, sellAsset in offered
  const dir1 =
    (nBuy.length === 0 || nBuy.some((b) => requestedCodes.has(b))) &&
    (nSell.length === 0 || nSell.some((s) => offeredCodes.has(s)));
  // Direction 2: buyAsset in offered, sellAsset in requested (reversed)
  const dir2 =
    (nBuy.length === 0 || nBuy.some((b) => offeredCodes.has(b))) &&
    (nSell.length === 0 || nSell.some((s) => requestedCodes.has(s)));

  return dir1 || dir2;
}
