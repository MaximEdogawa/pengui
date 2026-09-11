/**
 * Wires `src/shared/lib/wallet/offers/` (the transport-independent client-side offer
 * builder, TASK-001.04) into the Sage bridge: gathers spendable coins and a change
 * puzzle hash from the Sage client, calls the builder, signs through
 * `wallet.signCoinSpends` and broadcasts through `wallet.sendTransaction`.
 *
 * Kept separate from `SageBridgeProvider.ts` so the coin-gathering / puzzle-hash /
 * fee-resolution logic can be tested without exercising the whole adapter lifecycle
 * (connect, capability requests, event listeners).
 */
import type { SageClient, WalletGetAssetCoinsResult } from "sage-app-sdk";
import { convertToSmallestUnit } from "@/shared/lib/utils/chia-units";
import type {
  CancelOfferRequest,
  CancelOfferResponse,
  OfferRequest,
  OfferResponse,
  TakeOfferRequest,
  TakeOfferResponse,
} from "../types";
import {
  bytesToHex,
  cancelOffer,
  createOffer,
  loadChiaOfferDriver,
  OfferBuildError,
  parseOffer,
  takeOffer,
  type AssetCoinInput,
  type ChiaOfferDriver,
  type SignCoinSpendsFn,
} from "@/shared/lib/wallet/offers";

/** Loads the driver once and caches it (`loadChiaOfferDriver` itself is already memoised). */
export function getOfferDriver(): Promise<ChiaOfferDriver> {
  return loadChiaOfferDriver();
}

function bridgeSignCoinSpends(client: SageClient): SignCoinSpendsFn {
  return (coinSpends, { partialSign }) => client.wallet.signCoinSpends({ coinSpends, partialSign });
}

function toAssetCoinInput(coin: WalletGetAssetCoinsResult[number]): AssetCoinInput {
  return {
    coin: coin.coin,
    coinName: coin.coinName,
    puzzle: coin.puzzle,
    confirmedBlockIndex: coin.confirmedBlockIndex,
    locked: coin.locked,
    lineageProof: coin.lineageProof,
  };
}

/**
 * Fetches spendable coins for every asset kind in `assetIds` (`null` = XCH, otherwise a
 * CAT asset id) and flattens the results.
 *
 * `includedLocked` must be `true` when gathering an offer's own coins to cancel: Sage
 * marks a coin backing a live offer as locked/reserved, and the cancel spend needs to see
 * it anyway (see `cancelOffer.ts`).
 */
async function gatherAssetCoins(
  client: SageClient,
  assetIds: ReadonlySet<string | null>,
  { includedLocked = false }: { includedLocked?: boolean } = {}
): Promise<AssetCoinInput[]> {
  const batches = await Promise.all(
    Array.from(assetIds).map((assetId) =>
      client.wallet.getAssetCoins({
        type: assetId === null ? undefined : "cat",
        assetId: assetId ?? undefined,
        includedLocked,
      })
    )
  );
  return batches.flat().map(toAssetCoinInput);
}

/** The wallet's own receive puzzle hash, decoded from `wallet.getSyncStatus`'s address. */
async function resolveChangePuzzleHash(driver: ChiaOfferDriver, client: SageClient): Promise<string> {
  const status = await client.wallet.getSyncStatus();
  if (!status.receive_address) {
    throw new OfferBuildError("Sage returned no receive address to send change to");
  }
  return bytesToHex(driver.Address.decode(status.receive_address).puzzleHash);
}

function resolveFeeMojos(request: { feeInXch?: number; feeInMojos?: number }): string {
  if (request.feeInMojos != null) return String(Math.trunc(request.feeInMojos));
  if (request.feeInXch != null) return String(Math.trunc(convertToSmallestUnit(request.feeInXch, "xch")));
  return "0";
}

function normaliseHex(value: string): string {
  return value.replace(/^0x/i, "").toLowerCase();
}

/** Identity key for a coin, independent of whether `amount` arrived as a string or number. */
function coinKey(coin: { parent_coin_info: string; puzzle_hash: string; amount: string | number }): string {
  return `${normaliseHex(coin.parent_coin_info)}:${normaliseHex(coin.puzzle_hash)}:${BigInt(coin.amount).toString()}`;
}

function randomId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `sage-offer-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toOfferAssetAmounts(
  assets: OfferRequest["offerAssets" | "requestAssets"]
): Array<{ assetId: string | null; amount: string }> {
  return assets.map((asset) => ({
    assetId: asset.assetId || null,
    amount: String(Math.trunc(asset.amount)),
  }));
}

/**
 * Builds, signs and returns a maker offer. Coin candidates (XCH plus every offered CAT
 * asset id) and the change puzzle hash are gathered from the Sage client; the caller
 * (`SageBridgeProvider.createOffer`) is responsible for capability/connection checks.
 */
export async function sageCreateOffer(
  driver: ChiaOfferDriver,
  client: SageClient,
  request: OfferRequest
): Promise<OfferResponse> {
  const offerAssets = toOfferAssetAmounts(request.offerAssets);
  const requestAssets = toOfferAssetAmounts(request.requestAssets);
  const assetIds = new Set<string | null>([null, ...offerAssets.map((asset) => asset.assetId)]);

  const [coins, changePuzzleHash] = await Promise.all([
    gatherAssetCoins(client, assetIds),
    resolveChangePuzzleHash(driver, client),
  ]);

  const result = await createOffer(
    driver,
    { coins, changePuzzleHash, fee: String(Math.trunc(request.fee ?? 0)), offerAssets, requestAssets },
    bridgeSignCoinSpends(client)
  );

  const id = result.cancellableCoinIds[0] ?? randomId();
  return { offer: result.offer, tradeId: id, id };
}

/**
 * Takes an offer: gathers coins for whatever the offer asks the taker to pay (plus XCH
 * for the fee), signs and broadcasts.
 */
export async function sageTakeOffer(
  driver: ChiaOfferDriver,
  client: SageClient,
  request: TakeOfferRequest
): Promise<TakeOfferResponse> {
  const parsed = parseOffer(driver, request.offer);
  if (parsed.hasUnsupportedAssets) {
    throw new OfferBuildError(
      "This offer includes an NFT, DID or option-contract asset, which Pengui cannot take inside Sage yet."
    );
  }

  const assetIds = new Set<string | null>([
    null,
    ...parsed.requestedPayments.map((payment) => payment.assetId),
  ]);

  const [coins, changePuzzleHash] = await Promise.all([
    gatherAssetCoins(client, assetIds),
    resolveChangePuzzleHash(driver, client),
  ]);

  const result = await takeOffer(
    driver,
    { offer: request.offer, coins, changePuzzleHash, fee: resolveFeeMojos(request) },
    bridgeSignCoinSpends(client)
  );

  const sendResult = await client.wallet.sendTransaction({ spendBundle: result.spendBundle });
  if (sendResult.error) {
    throw new OfferBuildError(`Sage rejected the transaction: ${sendResult.error}`);
  }

  return { tradeId: randomId(), success: true };
}

/**
 * Cancels an offer by spending one or more of its own input coins back to the wallet.
 *
 * Sage has no offer book, so there is no `tradeId` to look the offer up by: the caller
 * must pass the original offer string as an `offerString` field on the cancel request
 * (`CancelOfferRequest` already allows arbitrary extra fields). Only coins Sage still
 * reports as spendable are used — an already-spent/taken offer cannot be cancelled.
 */
export async function sageCancelOffer(
  driver: ChiaOfferDriver,
  client: SageClient,
  request: CancelOfferRequest
): Promise<CancelOfferResponse> {
  const offerString = (request as Record<string, unknown>).offerString;
  if (typeof offerString !== "string" || !offerString) {
    throw new OfferBuildError(
      "Cancelling an offer inside Sage needs the original offer string (pass it as `offerString` on the cancel request)."
    );
  }

  const parsed = parseOffer(driver, offerString);
  const assetIds = new Set<string | null>([null, ...parsed.offeredCoins.map((coin) => coin.assetId)]);
  const allCoins = await gatherAssetCoins(client, assetIds, { includedLocked: true });

  const targetKeys = new Set(parsed.cancellableCoinSpends.map((spend) => coinKey(spend.coin)));
  const coins = allCoins.filter((coin) => targetKeys.has(coinKey(coin.coin)));
  if (coins.length === 0) {
    throw new OfferBuildError(
      "None of this offer's coins are in your wallet anymore — it may already be spent or taken."
    );
  }
  const feeCoins = allCoins.filter((coin) => !targetKeys.has(coinKey(coin.coin)));

  const changePuzzleHash = await resolveChangePuzzleHash(driver, client);
  const result = await cancelOffer(
    driver,
    { coins, changePuzzleHash, fee: resolveFeeMojos(request), feeCoins },
    bridgeSignCoinSpends(client)
  );

  const sendResult = await client.wallet.sendTransaction({ spendBundle: result.spendBundle });
  if (sendResult.error) {
    throw new OfferBuildError(`Sage rejected the cancel transaction: ${sendResult.error}`);
  }

  return { success: true };
}
