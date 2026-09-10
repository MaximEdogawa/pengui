/**
 * Pure request/response mapping between the Sage bridge shapes
 * (`sage-app-sdk`, camelCase methods, snake_case struct fields — see
 * pengui-wiki/architecture/sage-in-app-integration.md, "Wallet operation
 * mapping") and the provider-agnostic types in `shared/lib/wallet/types.ts`.
 *
 * Kept side-effect free and independent of the bridge transport so it can be
 * unit tested directly, without a fake `window.__SAGE__`.
 */
import type {
  EnvironmentGetNetworkResult,
  EnvironmentThemeView,
  GetTransactionsResponse,
  TransactionRecord,
  UserBridgeCapability,
  WalletGetAssetCoinsResult,
  WalletSpendableAssetCoin,
} from "sage-app-sdk";
import type { AssetCoin } from "@/shared/lib/walletConnect/types/walletConnect.types";
import type {
  AssetCoins,
  WalletCapabilities,
  WalletNetwork,
  WalletTransactionRecord,
} from "../types";

/**
 * Capabilities the adapter needs for the login/dashboard baseline: identity,
 * network, balances and coins. Requested (best-effort) on connect; the
 * provider still degrades per-call if one is missing rather than blocking.
 */
export const SAGE_REQUIRED_CAPABILITIES: UserBridgeCapability[] = [
  "app.get_capabilities",
  "app.request_capability_grant",
  "environment.get_network",
  "wallet.get_key",
  "wallet.get_sync_status",
  "wallet.get_asset_balance",
  "wallet.get_asset_coins",
];

/**
 * Capabilities requested on demand (connect time, best-effort, never block
 * login): everything approval-gated or otherwise optional. `WalletCapabilities`
 * exposed to the UI reflects whichever of these actually got granted.
 *
 * Typed as `string[]`, not `UserBridgeCapability[]`: `wallet.listen_selected_wallet_changed`
 * is documented on `xch-dev/sage@main`'s capability list but is not part of
 * `sage-app-sdk` 0.13.0's published `UserBridgeCapability` union yet (same gap
 * as `environment.openExternalUrl` — see `sageRawBridge.ts`).
 */
export const SAGE_OPTIONAL_CAPABILITIES: string[] = [
  "wallet.get_public_keys",
  "wallet.get_transactions",
  "wallet.get_derivations",
  "wallet.send_xch",
  "wallet.sign_coin_spends",
  "wallet.send_transaction",
  "wallet.sign_message",
  "environment.theme.get_current",
  "environment.theme.listen_changed",
  "storage.persistent_webview",
] satisfies string[];

/** Sage's `networkId` (`mainnet` / `testnet11` / ...) mapped to Pengui's network. */
export function mapSageNetwork(result: EnvironmentGetNetworkResult): WalletNetwork {
  if (result.kind === "mainnet" || result.kind === "testnet") return result.kind;
  return result.networkId?.toLowerCase().includes("testnet") ? "testnet" : "mainnet";
}

/**
 * Which `WalletCapabilities` flags are enabled given Sage's granted
 * capability list. Offer operations are always `false` here: the Sage bridge
 * has no offer RPCs, and the client-side builder (TASK-001.04) is wired in a
 * later pass. `switchNetwork` is always `false`: Sage owns the active network.
 */
export function computeSageWalletCapabilities(granted: readonly string[]): WalletCapabilities {
  const has = (capability: UserBridgeCapability) => granted.includes(capability);
  return {
    createOffer: false,
    takeOffer: false,
    cancelOffer: false,
    sendXch: has("wallet.send_xch"),
    signCoinSpends: has("wallet.sign_coin_spends"),
    signMessage: has("wallet.sign_message"),
    switchNetwork: false,
  };
}

const FALLBACK_LINEAGE_PROOF = { parentName: "", innerPuzzleHash: "", amount: 0 };

function mapAssetCoin(coin: WalletSpendableAssetCoin): AssetCoin {
  return {
    coin: {
      parent_coin_info: coin.coin.parent_coin_info,
      puzzle_hash: coin.coin.puzzle_hash,
      amount: Number(coin.coin.amount),
    },
    coinName: coin.coinName,
    confirmedBlockIndex: coin.confirmedBlockIndex,
    locked: coin.locked,
    puzzle: coin.puzzle,
    lineageProof: coin.lineageProof
      ? {
          parentName: coin.lineageProof.parentName ?? "",
          innerPuzzleHash: coin.lineageProof.innerPuzzleHash ?? "",
          amount: coin.lineageProof.amount != null ? Number(coin.lineageProof.amount) : 0,
        }
      : FALLBACK_LINEAGE_PROOF,
  };
}

export function mapSageAssetCoins(result: WalletGetAssetCoinsResult): AssetCoins {
  return result.map(mapAssetCoin);
}

/**
 * Sage's `TransactionRecord` has no standalone id: `wallet.getTransaction`
 * fetches one by `height`, so `height` is the stable identifier for a
 * confirmed transaction.
 */
function mapTransactionRecord(record: TransactionRecord): WalletTransactionRecord {
  return {
    transactionId: String(record.height),
    height: record.height,
    timestamp: record.timestamp,
    spent: record.spent,
    created: record.created,
  };
}

export function mapSageTransactions(
  result: GetTransactionsResponse
): WalletTransactionRecord[] {
  return result.transactions.map(mapTransactionRecord);
}

/**
 * Sage's theme carries an optional `mostLike` hint (`"light"` / `"dark"`);
 * fall back to sniffing the theme name for apps on an older host build that
 * omits it. Defaults to `"dark"`, Pengui's own default theme.
 */
export function mapSageThemeToNextTheme(theme: EnvironmentThemeView): "light" | "dark" {
  const hint = theme.mostLike?.toLowerCase();
  if (hint === "light" || hint === "dark") return hint;
  const name = `${theme.name} ${theme.displayName}`.toLowerCase();
  if (name.includes("light")) return "light";
  return "dark";
}
