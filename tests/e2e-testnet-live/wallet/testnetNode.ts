/**
 * Minimal testnet11 full-node RPC client for the live wallet peer.
 *
 * Talks to a public node (coinset.org by default, override with
 * `TESTNET_NODE_RPC_URL`) over plain HTTPS: the same JSON bodies the Chia
 * full-node RPC accepts, no client certificate. Only the handful of calls the
 * wallet peer needs: coin records, mempool lookup, broadcast, peak height.
 */
import type { OfferSpendBundle } from "../../../src/shared/lib/wallet/offers/types";

export interface NodeCoin {
  parent_coin_info: string;
  puzzle_hash: string;
  /** Mojos. The node serialises u64 as a JSON number. */
  amount: number;
}

export interface NodeCoinRecord {
  coin: NodeCoin;
  coinbase: boolean;
  confirmed_block_index: number;
  spent: boolean;
  spent_block_index: number;
  timestamp: number;
}

interface RpcEnvelope {
  success?: boolean;
  error?: string;
  [key: string]: unknown;
}

export const DEFAULT_TESTNET_NODE_RPC_URL = "https://testnet11.api.coinset.org";

export class TestnetNode {
  constructor(
    readonly baseUrl: string = process.env.TESTNET_NODE_RPC_URL ?? DEFAULT_TESTNET_NODE_RPC_URL
  ) {}

  private async rpc<T extends RpcEnvelope>(method: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${this.baseUrl.replace(/\/+$/, "")}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    const json = (await response.json()) as T;
    if (!response.ok && json.success !== true) {
      throw new Error(`${method}: HTTP ${response.status} ${json.error ?? ""}`.trim());
    }
    if (json.success === false) {
      throw new Error(`${method}: ${json.error ?? "unknown node error"}`);
    }
    return json;
  }

  async getPeakHeight(): Promise<number> {
    const result = await this.rpc<{ blockchain_state: { peak: { height: number } | null } }>(
      "get_blockchain_state",
      {}
    );
    return result.blockchain_state.peak?.height ?? 0;
  }

  async getUnspentCoins(puzzleHash: string): Promise<NodeCoinRecord[]> {
    const result = await this.rpc<{ coin_records: NodeCoinRecord[] }>(
      "get_coin_records_by_puzzle_hash",
      { puzzle_hash: `0x${puzzleHash.replace(/^0x/i, "")}`, include_spent_coins: false }
    );
    return result.coin_records;
  }

  async getCoinRecordByName(coinId: string): Promise<NodeCoinRecord | null> {
    try {
      const result = await this.rpc<{ coin_record: NodeCoinRecord }>("get_coin_record_by_name", {
        name: `0x${coinId.replace(/^0x/i, "")}`,
      });
      return result.coin_record;
    } catch (error) {
      if (error instanceof Error && /not found/i.test(error.message)) return null;
      throw error;
    }
  }

  async isInMempool(transactionId: string): Promise<boolean> {
    try {
      await this.rpc("get_mempool_item_by_tx_id", {
        tx_id: `0x${transactionId.replace(/^0x/i, "")}`,
      });
      return true;
    } catch (error) {
      if (error instanceof Error && /not in (the )?mempool|not found/i.test(error.message)) {
        return false;
      }
      throw error;
    }
  }

  /** Broadcast a signed bundle. Resolves once the node accepted it into its mempool. */
  async pushTx(bundle: OfferSpendBundle): Promise<{ status: string }> {
    const result = await this.rpc<{ status: string }>("push_tx", {
      spend_bundle: {
        coin_spends: bundle.coin_spends.map((spend) => ({
          coin: {
            parent_coin_info: `0x${spend.coin.parent_coin_info.replace(/^0x/i, "")}`,
            puzzle_hash: `0x${spend.coin.puzzle_hash.replace(/^0x/i, "")}`,
            amount: Number(spend.coin.amount),
          },
          puzzle_reveal: `0x${spend.puzzle_reveal.replace(/^0x/i, "")}`,
          solution: `0x${spend.solution.replace(/^0x/i, "")}`,
        })),
        aggregated_signature: `0x${bundle.aggregated_signature.replace(/^0x/i, "")}`,
      },
    });
    if (result.status !== "SUCCESS") {
      throw new Error(`push_tx returned ${result.status}`);
    }
    return result;
  }

  /** Poll until the coin is spent on chain (the transaction that spends it confirmed). */
  async waitForSpent(
    coinId: string,
    { timeoutMs = 240_000, intervalMs = 10_000 } = {}
  ): Promise<NodeCoinRecord> {
    const deadline = Date.now() + timeoutMs;
    const poll = async (): Promise<NodeCoinRecord> => {
      const record = await this.getCoinRecordByName(coinId);
      if (record?.spent) return record;
      if (Date.now() > deadline) {
        throw new Error(`Coin ${coinId} was not spent within ${timeoutMs / 1000} s`);
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      return poll();
    };
    return poll();
  }
}
