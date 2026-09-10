/**
 * Spend bundle assembly and `offer1...` encoding.
 *
 * `wallet.signCoinSpends` on the Sage bridge returns **only** the BLS aggregated
 * signature, not a spend bundle, so the caller has to put the bundle back together from
 * the spends it sent and the signature it got. That is what {@link assembleSpendBundle}
 * does; the rest of this module converts between the JSON shape and the driver's types.
 */
import type { ChiaOfferDriver } from "./driver";
import {
  bytesToHex,
  hexToBytes,
  OfferBuildError,
  toDriverSpendBundle,
  toOfferCoinSpend,
} from "./internal";
import type { OfferCoinSpend, OfferSpendBundle } from "./types";

/** Length of a BLS aggregated signature in bytes. */
const SIGNATURE_BYTES = 96;

/**
 * Rebuilds a spend bundle from the spends that were signed and the aggregated signature
 * the wallet returned.
 *
 * @param coinSpends - every spend that belongs in the bundle, in order. For a maker's
 *   offer this includes the requested-payment placeholders, which are not signed.
 * @param aggregatedSignature - hex, 96 bytes, as returned by `wallet.signCoinSpends`.
 *
 * @throws OfferBuildError when the signature is not a 96 byte hex string.
 */
export function assembleSpendBundle(
  coinSpends: OfferCoinSpend[],
  aggregatedSignature: string
): OfferSpendBundle {
  const signature = hexToBytes(aggregatedSignature, "aggregated signature");
  if (signature.length !== SIGNATURE_BYTES) {
    throw new OfferBuildError(
      `Expected a ${SIGNATURE_BYTES} byte aggregated signature, got ${signature.length} bytes`
    );
  }
  if (coinSpends.length === 0) {
    throw new OfferBuildError("Cannot assemble a spend bundle with no coin spends");
  }

  return { coin_spends: coinSpends, aggregated_signature: bytesToHex(signature) };
}

/**
 * Aggregates BLS signatures into one.
 *
 * Used when a taker's signature has to be combined with the maker's signature carried by
 * the offer.
 */
export function aggregateSignatures(driver: ChiaOfferDriver, signatures: string[]): string {
  return bytesToHex(
    driver.Signature.aggregate(
      signatures.map((signature) => driver.Signature.fromBytes(hexToBytes(signature, "signature")))
    ).toBytes()
  );
}

/** The all-zero BLS signature, used as a placeholder before signing. */
export function infinitySignature(driver: ChiaOfferDriver): string {
  return bytesToHex(driver.Signature.infinity().toBytes());
}

/**
 * Encodes a spend bundle as a bech32m `offer1...` string.
 *
 * The driver compresses the bundle with the same versioned puzzle dictionary the
 * reference wallet uses, so the output is interchangeable with offers produced by Sage,
 * the Chia reference wallet, Dexie and Tibet.
 */
export function encodeOfferBundle(driver: ChiaOfferDriver, bundle: OfferSpendBundle): string {
  try {
    return driver.encodeOffer(toDriverSpendBundle(driver, bundle));
  } catch (error) {
    throw new OfferBuildError("Could not encode the offer", { cause: error });
  }
}

/** Decodes a bech32m `offer1...` string into a spend bundle. */
export function decodeOfferBundle(driver: ChiaOfferDriver, offer: string): OfferSpendBundle {
  const trimmed = offer.trim();
  if (!trimmed.startsWith("offer1")) {
    throw new OfferBuildError('Offer strings must start with "offer1"');
  }

  let bundle: InstanceType<ChiaOfferDriver["SpendBundle"]>;
  try {
    bundle = driver.decodeOffer(trimmed);
  } catch (error) {
    throw new OfferBuildError("Could not decode the offer", { cause: error });
  }

  return {
    coin_spends: bundle.coinSpends.map(toOfferCoinSpend),
    aggregated_signature: bytesToHex(bundle.aggregatedSignature.toBytes()),
  };
}
