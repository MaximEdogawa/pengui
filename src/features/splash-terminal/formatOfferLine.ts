import type { DexieOffer } from "@/entities/offer";

export function formatOfferLine(offer: DexieOffer): string {
  const offered =
    offer.offered?.map((a) => `${a.code}:${a.amount}`).join(" ") ?? "";
  const requested =
    offer.requested?.map((a) => `${a.code}:${a.amount}`).join(" ") ?? "";
  const id = offer.id || "-";
  const price =
    typeof offer.price === "number" ? offer.price.toFixed(4) : "-";
  // Streamed offers often have only the raw offer string (e.g. offer1qqr...)
  const hasDetails = offered || requested || (offer.id && offer.id.length > 0);
  if (!hasDetails && offer.offer) {
    const raw = offer.offer.trim();
    const preview = raw.length > 72 ? `${raw.slice(0, 72)}...` : raw;
    return `  ${preview}`;
  }
  return `  ${id.slice(0, 12)}... | price: ${price} | ${offered} -> ${requested}`;
}
