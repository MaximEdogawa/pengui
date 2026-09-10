/**
 * Plain-data types for the client-side Chia offer driver.
 *
 * Everything in `src/shared/lib/wallet/offers/` is transport independent: it never
 * imports a wallet provider, adapter, React hook or feature module. Callers pass coins
 * and intents in, and get plain JSON-serialisable data back, so the same code works
 * behind the Sage bridge, behind WalletConnect, or in a unit test.
 *
 * Amounts are always **mojos as decimal strings**. Mojo amounts are `u64` on chain and
 * exceed `Number.MAX_SAFE_INTEGER` above ~9007 XCH, so they never travel as `number`
 * inside this module. Hashes and serialised programs are lower-case hex **without** a
 * `0x` prefix, matching the Sage bridge and CHIP-0002.
 */

/** A coin as the Sage bridge and CHIP-0002 serialise it (snake_case, hex fields). */
export interface OfferCoinJson {
  parent_coin_info: string;
  puzzle_hash: string;
  /** Mojos. Decimal string; the Sage bridge accepts a string or a number here. */
  amount: string;
}

/**
 * A coin spend in the exact shape `wallet.signCoinSpends` expects.
 *
 * Sage's `WalletSignCoinSpend` is `#[serde(deny_unknown_fields)]` and is *not*
 * renamed, so the members stay snake_case even though the surrounding params
 * (`coinSpends`, `partialSign`) are camelCase.
 */
export interface OfferCoinSpend {
  coin: OfferCoinJson;
  puzzle_reveal: string;
  solution: string;
}

/** A spend bundle ready for `wallet.sendTransaction` or for offer encoding. */
export interface OfferSpendBundle {
  coin_spends: OfferCoinSpend[];
  /** BLS aggregated signature, 96 bytes of hex. */
  aggregated_signature: string;
}

/** Lineage proof as `wallet.getAssetCoins` returns it. All members are optional there. */
export interface AssetCoinLineageProof {
  parentName?: string | null;
  innerPuzzleHash?: string | null;
  amount?: string | number | null;
}

/**
 * One spendable coin as `wallet.getAssetCoins` returns it.
 *
 * Structurally compatible with `AssetCoin` in
 * `src/shared/lib/walletConnect/types/walletConnect.types.ts` and with Sage's
 * `WalletSpendableAssetCoin`; both amount encodings (string and number) are accepted.
 */
export interface AssetCoinInput {
  coin: {
    parent_coin_info: string;
    puzzle_hash: string;
    amount: string | number;
  };
  /** Coin id. Optional: it is recomputed from the coin and only cross-checked when present. */
  coinName?: string;
  /** Full puzzle reveal of the coin, hex. Required — the synthetic key is recovered from it. */
  puzzle: string;
  confirmedBlockIndex?: number;
  locked?: boolean;
  lineageProof?: AssetCoinLineageProof | null;
}

/**
 * An asset in an offer intent.
 *
 * `assetId` is the CAT tail hash (hex). XCH is expressed as `null`, `undefined` or the
 * empty string, matching how `OfferRequest.offerAssets` encodes it today.
 */
export interface OfferAssetAmount {
  assetId?: string | null;
  /** Mojos (XCH) or CAT units, decimal string. */
  amount: string;
}

/** A payment the taker must make, as parsed out of an offer's requested-payment spends. */
export interface ParsedPayment {
  puzzleHash: string;
  amount: string;
  /** Serialised memos program, hex, when the payment carries memos. */
  memos?: string;
}

/** A notarized payment group: one nonce, one or more payments. */
export interface ParsedNotarizedPayment {
  nonce: string;
  payments: ParsedPayment[];
}

/** Everything one side of an offer asks for, grouped per asset. */
export interface ParsedRequestedPayments {
  /** `null` for XCH, otherwise the CAT asset id. */
  assetId: string | null;
  /** Puzzle hash the taker must pay into (settlement, or CAT-wrapped settlement). */
  settlementPuzzleHash: string;
  /** Serialised puzzle reveal of the placeholder spend, hex. */
  puzzleReveal: string;
  notarizedPayments: ParsedNotarizedPayment[];
  /** Sum of all payment amounts for this asset, decimal string. */
  totalAmount: string;
}

/** One coin the maker offered, i.e. a coin created at a settlement puzzle hash. */
export interface ParsedOfferedCoin {
  /** `null` for XCH, otherwise the CAT asset id. */
  assetId: string | null;
  coin: OfferCoinJson;
  /** Settlement puzzle hash the coin sits at (CAT-wrapped for CATs). */
  settlementPuzzleHash: string;
}

/** The structured view of an `offer1...` string. */
export interface ParsedOffer {
  /** The offer string this was parsed from, re-encoded canonically. */
  offer: string;
  /** Every coin spend in the bundle, including the requested-payment placeholders. */
  coinSpends: OfferCoinSpend[];
  aggregatedSignature: string;
  /** Coins the maker created at settlement puzzle hashes — what the taker receives. */
  offeredCoins: ParsedOfferedCoin[];
  /** What the maker asks for, from the placeholder spends (parent coin id all zeroes). */
  requestedPayments: ParsedRequestedPayments[];
  /**
   * Coin spends whose coin was not created inside the bundle: the maker's own inputs.
   * Spending one of these back to the maker cancels the offer.
   */
  cancellableCoinSpends: OfferCoinSpend[];
  /** Whether the bundle contains any asset kind this module cannot handle (NFT, DID, option). */
  hasUnsupportedAssets: boolean;
}

/**
 * Signs coin spends and returns **only** the BLS aggregated signature, hex.
 *
 * This is exactly `wallet.signCoinSpends` on the Sage bridge. It is injected as a
 * parameter so this module never depends on a wallet provider.
 *
 * @param coinSpends - the spends to sign, in bridge shape.
 * @param options.partialSign - true when the bundle is deliberately incomplete, which
 *   is the case for a maker's offer: it can never be a valid standalone transaction.
 */
export type SignCoinSpendsFn = (
  coinSpends: OfferCoinSpend[],
  options: { partialSign: boolean }
) => Promise<string>;

/** Common input for every builder: which coins may be spent and where change goes. */
export interface OfferSpendContextInput {
  /**
   * Candidate coins, as `wallet.getAssetCoins` returns them. Include XCH coins for the
   * fee and for any offered XCH, and CAT coins for any offered CAT. Locked coins should
   * be filtered out by the caller.
   */
  coins: AssetCoinInput[];
  /** Puzzle hash change is sent to, hex. Normally the wallet's own receive puzzle hash. */
  changePuzzleHash: string;
  /** Network fee in mojos, decimal string. Defaults to `"0"`. */
  fee?: string;
}

/** Input for {@link buildCreateOfferSpends}. */
export interface CreateOfferInput extends OfferSpendContextInput {
  /** Assets the maker gives away. */
  offerAssets: OfferAssetAmount[];
  /** Assets the maker wants in return. */
  requestAssets: OfferAssetAmount[];
  /**
   * Puzzle hash the requested assets are paid to, hex. Defaults to `changePuzzleHash`.
   */
  receivePuzzleHash?: string;
}

/** Input for {@link buildTakeOfferSpends}. */
export interface TakeOfferInput extends OfferSpendContextInput {
  /** The `offer1...` string being taken. */
  offer: string;
}

/** Input for {@link buildCancelOfferSpends}. */
export interface CancelOfferInput {
  /**
   * Coins to spend back to the wallet, as `wallet.getCoinsByIds` / `wallet.getAssetCoins`
   * returns them. Use {@link parseOffer} `cancellableCoinSpends` to find their ids.
   */
  coins: AssetCoinInput[];
  /** Puzzle hash the coins are sent back to, hex. */
  changePuzzleHash: string;
  /** Network fee in mojos, decimal string. Defaults to `"0"`. */
  fee?: string;
  /** Extra XCH coins that may be spent to cover the fee, when the cancelled coins are CATs. */
  feeCoins?: AssetCoinInput[];
}

/** What a builder produces before signing. */
export interface UnsignedSpends {
  /** The coin spends to hand to `signCoinSpends`. */
  coinSpends: OfferCoinSpend[];
  /**
   * True when the spends do not form a complete, valid transaction on their own and
   * must be signed with `partialSign: true`. Always true for a maker's offer.
   */
  partialSign: boolean;
}

/** Result of {@link createOffer}. */
export interface CreateOfferResult {
  /** The bech32m `offer1...` string. */
  offer: string;
  /** The full maker bundle, including the requested-payment placeholder spends. */
  spendBundle: OfferSpendBundle;
  /**
   * Coin ids the offer depends on. Spending any of these back to the wallet cancels it.
   */
  cancellableCoinIds: string[];
}

/** Result of {@link takeOffer}. */
export interface TakeOfferResult {
  /** The combined maker + taker bundle, ready for `wallet.sendTransaction`. */
  spendBundle: OfferSpendBundle;
  /** The taker's own spends only, before combining. Useful for diagnostics. */
  takerCoinSpends: OfferCoinSpend[];
}

/** Result of {@link cancelOffer}. */
export interface CancelOfferResult {
  /** The cancel transaction, ready for `wallet.sendTransaction`. */
  spendBundle: OfferSpendBundle;
}
