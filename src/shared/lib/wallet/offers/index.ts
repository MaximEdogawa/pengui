/**
 * Client-side Chia offer construction.
 *
 * The Sage app bridge exposes no `createOffer` / `takeOffer` / `cancelOffer` methods — it
 * only offers `wallet.getAssetCoins`, `wallet.signCoinSpends` (which returns an
 * aggregated signature and nothing else), `wallet.getCoinsByIds` and
 * `wallet.sendTransaction`. This module fills the gap: it builds offer, take and cancel
 * spends in the browser with the `chia-wallet-sdk` WebAssembly bindings, and leaves
 * signing and broadcasting to the caller.
 *
 * Everything here is transport independent. There are no imports from a wallet provider,
 * adapter, React hook or feature module: coins, intents and a `signCoinSpends` callback
 * go in, plain JSON-serialisable data comes out. Mojo amounts are decimal strings
 * throughout, because `u64` mojo values exceed `Number.MAX_SAFE_INTEGER`.
 *
 * ## Supported
 *
 * - XCH and CAT (including revocable CATs) on both sides of an offer.
 * - Create, take and cancel, with an optional network fee on each.
 *
 * ## Not supported
 *
 * - NFT, DID and option-contract offers. Those need royalty handling and singleton
 *   lineage the module does not implement; {@link parseOffer} flags them through
 *   `hasUnsupportedAssets` so the UI can disable the action with an explanation.
 * - Wallets whose coins are not controlled by the standard
 *   `p2_delegated_puzzle_or_hidden_puzzle` (for example Sage vaults / MIPS custody).
 *
 * @example
 * ```ts
 * import { loadChiaOfferDriver, createOffer } from "@/shared/lib/wallet/offers";
 *
 * const driver = await loadChiaOfferDriver();
 * const { offer } = await createOffer(driver, input, signCoinSpends);
 * ```
 */
export {
  loadChiaOfferDriver,
  resetChiaOfferDriver,
  DEFAULT_CHIA_WASM_PATH,
  type ChiaOfferDriver,
  type ChiaWasmSource,
} from "./driver";

export { OfferBuildError, notarizedPaymentNonce, settlementPuzzleHashFor } from "./internal";

export {
  assembleSpendBundle,
  aggregateSignatures,
  infinitySignature,
  encodeOfferBundle,
  decodeOfferBundle,
} from "./spendBundle";

export { parseOffer, isPlaceholderSpend } from "./parseOffer";

export {
  buildCreateOfferSpends,
  assembleCreateOfferResult,
  createOffer,
  type CreateOfferPlan,
} from "./createOffer";

export {
  buildTakeOfferSpends,
  assembleTakeOfferResult,
  takeOffer,
  type TakeOfferPlan,
} from "./takeOffer";

export {
  buildCancelOfferSpends,
  assembleCancelOfferResult,
  cancelOffer,
  type CancelOfferPlan,
} from "./cancelOffer";

export type {
  AssetCoinInput,
  AssetCoinLineageProof,
  CancelOfferInput,
  CancelOfferResult,
  CreateOfferInput,
  CreateOfferResult,
  OfferAssetAmount,
  OfferCoinJson,
  OfferCoinSpend,
  OfferSpendBundle,
  OfferSpendContextInput,
  ParsedNotarizedPayment,
  ParsedOffer,
  ParsedOfferedCoin,
  ParsedPayment,
  ParsedRequestedPayments,
  SignCoinSpendsFn,
  TakeOfferInput,
  TakeOfferResult,
  UnsignedSpends,
} from "./types";
