/* eslint-disable no-console */
/**
 * TestnetLiveWallet — a WalletConnect wallet peer backed by a real testnet11 key.
 *
 * Same transport as `SageMockWallet` (it pairs with the app through the
 * WalletConnect relay and approves the `chia:testnet` chain), but every RPC is
 * answered from reality instead of fixtures:
 *
 * - identity from the key derived from `TESTNET_WALLET_MNEMONIC`
 * - balance and coins from a testnet11 full node
 * - `chia_send` builds a standard spend, signs every `AGG_SIG_ME` with the wallet's
 *   synthetic key and broadcasts it
 * - `chia_createOffer` / `chia_cancelOffer` run the app's own client-side offer
 *   builder (`src/shared/lib/wallet/offers`) with the same signer
 *
 * Guard rails for an automation wallet: the transfer amount is capped
 * (`TESTNET_MAX_TRANSFER_MOJOS`, default 0.01 TXCH) and every broadcast is recorded
 * in {@link TestnetLiveWallet.sends} so a run leaves coin and transaction ids behind.
 */
import {
  cancelOffer,
  createOffer,
  parseOffer,
  type AssetCoinInput,
  type OfferCoinSpend,
  type OfferSpendBundle,
} from "../../../src/shared/lib/wallet/offers";
import { SageMockWallet } from "../../e2e/wallet-mock/SageMockWallet";
import {
  bytesToHex,
  coinIdOf,
  deriveLiveWalletKeys,
  hexToBytes,
  spendBundleId,
  strip0x,
  type LiveWalletKeys,
} from "./keys";
import { TestnetNode, type NodeCoinRecord } from "./testnetNode";

/** 0.01 TXCH — the most a single `chia_send` may move unless overridden. */
export const DEFAULT_MAX_TRANSFER_MOJOS = BigInt("10000000000");
/** 0.01 TXCH — refuse to run below this so a drained wallet fails fast. */
export const DEFAULT_MIN_BALANCE_MOJOS = BigInt("10000000000");

export interface LiveSendRecord {
  method: string;
  /** Spend bundle hash, the id a full node's mempool uses. */
  transactionId: string;
  spentCoinIds: string[];
  amount: string;
  fee: string;
  address: string;
  at: string;
}

interface SendParams {
  address: string;
  amount: number | string;
  fee?: number | string;
  memos?: string[];
}

interface OfferAssetParam {
  assetId?: string | null;
  amount: number | string;
}

function mojos(value: number | string | undefined, fallback = BigInt("0")): bigint {
  if (value === undefined || value === null || value === "") return fallback;
  return typeof value === "number" ? BigInt(Math.trunc(value)) : BigInt(value);
}

function envBigInt(name: string, fallback: bigint): bigint {
  const raw = process.env[name];
  return raw && raw.trim() ? BigInt(raw.trim()) : fallback;
}

export class TestnetLiveWallet extends SageMockWallet {
  readonly keys: LiveWalletKeys;
  readonly node: TestnetNode;
  readonly maxTransferMojos: bigint;
  /** Every broadcast this peer made, oldest first. */
  readonly sends: LiveSendRecord[] = [];
  /** Offers created through `chia_createOffer`, by trade id, so `chia_cancelOffer` can find them. */
  readonly offers = new Map<string, string>();

  private constructor(keys: LiveWalletKeys, node: TestnetNode, maxTransferMojos: bigint) {
    super("chia:testnet");
    this.keys = keys;
    this.node = node;
    this.maxTransferMojos = maxTransferMojos;
  }

  /**
   * Build the peer from `TESTNET_WALLET_MNEMONIC`, cross-checking
   * `TESTNET_WALLET_FINGERPRINT` / `TESTNET_WALLET_ADDRESS` when they are set so a
   * mismatched secret is caught before anything is signed.
   */
  static async fromEnv(): Promise<TestnetLiveWallet> {
    const mnemonic = process.env.TESTNET_WALLET_MNEMONIC;
    if (!mnemonic) throw new Error("TESTNET_WALLET_MNEMONIC is not set");
    if ((process.env.TESTNET_EXPECTED_NETWORK ?? "testnet") !== "testnet") {
      throw new Error("TESTNET_EXPECTED_NETWORK must be 'testnet'; this peer never signs for mainnet");
    }

    const keys = await deriveLiveWalletKeys(mnemonic, "txch");
    const expectedFingerprint = process.env.TESTNET_WALLET_FINGERPRINT?.trim();
    if (expectedFingerprint && Number(expectedFingerprint) !== keys.fingerprint) {
      throw new Error(
        `TESTNET_WALLET_FINGERPRINT (${expectedFingerprint}) does not match the mnemonic (${keys.fingerprint})`
      );
    }
    const expectedAddress = process.env.TESTNET_WALLET_ADDRESS?.trim();
    if (expectedAddress && expectedAddress !== keys.address) {
      throw new Error(
        `TESTNET_WALLET_ADDRESS (${expectedAddress}) does not match the mnemonic's first address (${keys.address})`
      );
    }

    return new TestnetLiveWallet(
      keys,
      new TestnetNode(),
      envBigInt("TESTNET_MAX_TRANSFER_MOJOS", DEFAULT_MAX_TRANSFER_MOJOS)
    );
  }

  override get fingerprint(): number {
    return this.keys.fingerprint;
  }

  override get address(): string {
    return this.keys.address;
  }

  // ── Chain reads ────────────────────────────────────────────────────────────

  getUnspentCoins(): Promise<NodeCoinRecord[]> {
    return this.node.getUnspentCoins(this.keys.puzzleHash);
  }

  async getBalanceMojos(): Promise<bigint> {
    const coins = await this.getUnspentCoins();
    return coins.reduce((total, record) => total + BigInt(record.coin.amount), BigInt("0"));
  }

  /** Fail fast when the wallet cannot pay for a run. */
  async assertFunded(minimum = envBigInt("TESTNET_MIN_BALANCE_MOJOS", DEFAULT_MIN_BALANCE_MOJOS)) {
    const balance = await this.getBalanceMojos();
    if (balance < minimum) {
      throw new Error(
        `Testnet wallet ${this.keys.address} holds ${balance} mojos, below the ${minimum} mojo minimum. ` +
          "Top it up at https://testnet11-faucet.chia.net/ before running e2e-testnet-live."
      );
    }
    return balance;
  }

  private toAssetCoin(record: NodeCoinRecord): AssetCoinInput & { coinName: string } {
    const coin = {
      parent_coin_info: strip0x(record.coin.parent_coin_info),
      puzzle_hash: strip0x(record.coin.puzzle_hash),
      amount: String(record.coin.amount),
    };
    return {
      coin,
      coinName: coinIdOf(this.keys.driver, { coin, puzzle_reveal: "", solution: "" }),
      puzzle: this.keys.standardPuzzleReveal,
      confirmedBlockIndex: record.confirmed_block_index,
      locked: false,
      lineageProof: null,
    };
  }

  // ── RPC dispatch ───────────────────────────────────────────────────────────

  protected override async buildResponse(method: string, params: unknown): Promise<unknown> {
    const request = (params ?? {}) as Record<string, unknown>;
    switch (method) {
      case "chip0002_connect":
        return { success: true, fingerprint: this.fingerprint, address: this.address };
      case "chip0002_chainId":
        return { chainId: this.chainId };
      case "chia_getAddress":
        return { success: true, address: this.address, walletId: 1 };
      case "chip0002_getPublicKeys":
        return { publicKeys: [{ walletId: 1, publicKey: `0x${this.keys.syntheticPublicKey}` }] };
      case "chip0002_getAssetBalance":
        return this.assetBalance(request);
      case "chip0002_getAssetCoins":
        return this.assetCoins(request);
      case "chip0002_filterUnlockedCoins":
        return { coins: request.coinNames ?? [] };
      case "chip0002_signMessage":
      case "chia_signMessageByAddress":
        return this.signMessage(request);
      case "chip0002_signCoinSpends":
        return this.signCoinSpends(request);
      case "chip0002_sendTransaction":
        return this.sendTransaction(request);
      case "chia_send":
        return this.sendXch(request as unknown as SendParams);
      case "chia_createOffer":
        return this.createOffer(request);
      case "chia_cancelOffer":
        return this.cancelOffer(request);
      case "chia_getNfts":
        return { nfts: [] };
      default:
        return { success: false, error: `TestnetLiveWallet: method "${method}" is not supported` };
    }
  }

  private async assetBalance(request: Record<string, unknown>) {
    const type = (request.type as string | null | undefined) ?? null;
    if (type && type !== "xch") {
      return { confirmed: "0", spendable: "0", spendableCoinCount: 0 };
    }
    const coins = await this.getUnspentCoins();
    const total = coins.reduce((sum, record) => sum + BigInt(record.coin.amount), BigInt("0")).toString();
    return { confirmed: total, spendable: total, spendableCoinCount: coins.length };
  }

  private async assetCoins(request: Record<string, unknown>) {
    const type = (request.type as string | null | undefined) ?? null;
    if (type && type !== "xch") return { coins: [] };
    const coins = await this.getUnspentCoins();
    return {
      coins: coins.map((record) => {
        const asset = this.toAssetCoin(record);
        return {
          ...asset,
          coin: { ...asset.coin, amount: Number(asset.coin.amount) },
          lineageProof: { parentName: "", innerPuzzleHash: "", amount: 0 },
        };
      }),
    };
  }

  private signMessage(request: Record<string, unknown>) {
    const message = String(request.message ?? "");
    return {
      success: true,
      signature: `0x${this.keys.signMessage(new TextEncoder().encode(message))}`,
      publicKey: `0x${this.keys.syntheticPublicKey}`,
      message,
      address: this.address,
    };
  }

  private async signCoinSpends(request: Record<string, unknown>) {
    const coinSpends = (request.coinSpends ?? []) as OfferCoinSpend[];
    const aggregatedSignature = await this.keys.sign(coinSpends, { partialSign: true });
    return { success: true, signedCoinSpends: coinSpends, aggregatedSignature };
  }

  private async sendTransaction(request: Record<string, unknown>) {
    const bundle = request.spendBundle as OfferSpendBundle | undefined;
    if (!bundle) return { success: false, error: "spendBundle is required" };
    const transactionId = await this.broadcast("chip0002_sendTransaction", bundle, {
      amount: "0",
      fee: "0",
      address: "",
    });
    return { success: true, status: 1, transactionId };
  }

  /** Build, sign and broadcast a standard XCH transfer. */
  async sendXch(params: SendParams) {
    const amount = mojos(params.amount);
    const fee = mojos(params.fee);
    if (amount <= BigInt("0")) return { success: false, error: "amount must be positive" };
    if (amount > this.maxTransferMojos) {
      return {
        success: false,
        error: `Transfer of ${amount} mojos exceeds the automation cap of ${this.maxTransferMojos} mojos`,
      };
    }

    const { driver } = this.keys;
    const recipient = driver.Address.decode(params.address.trim());
    const records = (await this.getUnspentCoins()).sort(
      (a, b) => Number(BigInt(b.coin.amount) - BigInt(a.coin.amount))
    );

    const selected: NodeCoinRecord[] = [];
    let total = BigInt("0");
    for (const record of records) {
      if (total >= amount + fee) break;
      selected.push(record);
      total += BigInt(record.coin.amount);
    }
    if (total < amount + fee) {
      return { success: false, error: `Insufficient funds: ${total} mojos available, ${amount + fee} needed` };
    }

    const clvm = new driver.Clvm();
    const syntheticKey = driver.PublicKey.fromBytes(hexToBytes(this.keys.syntheticPublicKey));
    const change = total - amount - fee;
    const memos =
      params.memos?.length ?
        clvm.list(params.memos.map((memo) => clvm.atom(new TextEncoder().encode(memo))))
      : undefined;
    const conditions = [
      clvm.createCoin(recipient.puzzleHash, amount, memos),
      ...(change > BigInt("0") ? [clvm.createCoin(hexToBytes(this.keys.puzzleHash), change)] : []),
      ...(fee > BigInt("0") ? [clvm.reserveFee(fee)] : []),
    ];

    selected.forEach((record, index) => {
      const coin = new driver.Coin(
        hexToBytes(strip0x(record.coin.parent_coin_info)),
        hexToBytes(strip0x(record.coin.puzzle_hash)),
        BigInt(record.coin.amount)
      );
      clvm.spendStandardCoin(coin, syntheticKey, clvm.delegatedSpend(index === 0 ? conditions : []));
    });

    const coinSpends: OfferCoinSpend[] = clvm.coinSpends().map((spend) => ({
      coin: {
        parent_coin_info: bytesToHex(spend.coin.parentCoinInfo),
        puzzle_hash: bytesToHex(spend.coin.puzzleHash),
        amount: spend.coin.amount.toString(),
      },
      puzzle_reveal: bytesToHex(spend.puzzleReveal),
      solution: bytesToHex(spend.solution),
    }));

    const aggregated_signature = await this.keys.sign(coinSpends, { partialSign: false });
    const bundle: OfferSpendBundle = { coin_spends: coinSpends, aggregated_signature };
    const transactionId = await this.broadcast("chia_send", bundle, {
      amount: amount.toString(),
      fee: fee.toString(),
      address: params.address,
    });

    return {
      success: true,
      transactionId,
      transaction: { spentCoinIds: coinSpends.map((spend) => coinIdOf(driver, spend)) },
    };
  }

  private async createOffer(request: Record<string, unknown>) {
    const toAssets = (list: unknown) =>
      ((list ?? []) as OfferAssetParam[]).map((asset) => ({
        assetId: asset.assetId ? asset.assetId : null,
        amount: mojos(asset.amount).toString(),
      }));
    const offerAssets = toAssets(request.offerAssets);
    if (offerAssets.some((asset) => asset.assetId)) {
      return { success: false, error: "The live testnet wallet only holds XCH; it cannot offer CATs" };
    }
    const offered = offerAssets.reduce((sum, asset) => sum + BigInt(asset.amount), BigInt("0"));
    if (offered > this.maxTransferMojos) {
      return { success: false, error: `Offered ${offered} mojos exceeds the automation cap` };
    }

    const coins = (await this.getUnspentCoins()).map((record) => this.toAssetCoin(record));
    const result = await createOffer(
      this.keys.driver,
      {
        coins,
        changePuzzleHash: this.keys.puzzleHash,
        fee: mojos(request.fee as number | string | undefined).toString(),
        offerAssets,
        requestAssets: toAssets(request.requestAssets),
      },
      this.keys.sign
    );
    const tradeId = result.cancellableCoinIds[0] ?? spendBundleId(this.keys.driver, result.spendBundle);
    this.offers.set(tradeId, result.offer);
    console.log(`[TestnetLiveWallet] created offer ${tradeId} (${result.offer.length} chars)`);
    return { success: true, offer: result.offer, tradeId, id: tradeId };
  }

  private async cancelOffer(request: Record<string, unknown>) {
    const tradeId = String(request.tradeId ?? request.id ?? "");
    const offer =
      (typeof request.offerString === "string" ? request.offerString : undefined) ??
      this.offers.get(tradeId);
    if (!offer) {
      return { success: false, error: `Unknown offer ${tradeId}: this peer only cancels offers it created` };
    }

    const parsed = parseOffer(this.keys.driver, offer);
    const targets = new Set(parsed.cancellableCoinSpends.map((spend) => coinIdOf(this.keys.driver, spend)));
    const all = (await this.getUnspentCoins()).map((record) => this.toAssetCoin(record));
    const coins = all.filter((coin) => targets.has(coin.coinName));
    if (coins.length === 0) {
      return { success: false, error: "None of the offer's coins are unspent any more" };
    }

    const result = await cancelOffer(
      this.keys.driver,
      {
        coins,
        changePuzzleHash: this.keys.puzzleHash,
        fee: mojos(request.fee as number | string | undefined).toString(),
        feeCoins: all.filter((coin) => !targets.has(coin.coinName)),
      },
      this.keys.sign
    );
    await this.broadcast("chia_cancelOffer", result.spendBundle, { amount: "0", fee: "0", address: "" });
    this.offers.delete(tradeId);
    return { success: true };
  }

  private async broadcast(
    method: string,
    bundle: OfferSpendBundle,
    detail: Pick<LiveSendRecord, "amount" | "fee" | "address">
  ): Promise<string> {
    const transactionId = spendBundleId(this.keys.driver, bundle);
    await this.node.pushTx(bundle);
    const record: LiveSendRecord = {
      method,
      transactionId,
      spentCoinIds: bundle.coin_spends
        .filter((spend) => !/^(0x)?0{64}$/i.test(spend.coin.parent_coin_info))
        .map((spend) => coinIdOf(this.keys.driver, spend)),
      ...detail,
      at: new Date().toISOString(),
    };
    this.sends.push(record);
    console.log(`[TestnetLiveWallet] ${method} broadcast`, JSON.stringify(record));
    return transactionId;
  }
}
