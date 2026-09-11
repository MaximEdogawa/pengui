// Import chain IDs from networkUtils to avoid duplication
import { CHIA_MAINNET_CHAIN_ID, CHIA_TESTNET_CHAIN_ID } from "../utils/networkUtils";

// Re-export for backward compatibility
export { CHIA_MAINNET_CHAIN_ID, CHIA_TESTNET_CHAIN_ID };

const getCurrentUrl = (): string => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "https://pengui.space";
};

/**
 * One-line description of the app.
 *
 * User-visible: it is what a wallet shows in its pairing / approval dialog via the
 * WalletConnect metadata below. Keep it short — pairing dialogs truncate — and keep it
 * true of the shipped build, not of the roadmap.
 */
export const APP_DESCRIPTION =
  "Trade, swap and manage Chia offers — in your browser or inside the Sage wallet";

export const environment = {
  appName: "Pengui",
  /**
   * Set from `package.json` at build time by `next.config.ts`. Never hardcode it here:
   * the previous literal ("1.0.0") drifted six releases away from the real version.
   */
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION || "0.0.0",
  appDescription: APP_DESCRIPTION,

  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",
  isTest: process.env.NODE_ENV === "test",

  wallet: {
    walletConnect: {
      projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "",
      metadata: {
        name: "Pengui",
        description: APP_DESCRIPTION,
        url: getCurrentUrl(),
        icons: [
          `${getCurrentUrl()}/icons/icon-192x192.png`,
          `${getCurrentUrl()}/icons/icon-512x512.png`,
          `${getCurrentUrl()}/favicon.svg`,
          `${getCurrentUrl()}/pengui-logo.png`,
        ],
      },
      networks: {
        chia: {
          mainnet: CHIA_MAINNET_CHAIN_ID,
          testnet: CHIA_TESTNET_CHAIN_ID,
          current: CHIA_MAINNET_CHAIN_ID, // Default to mainnet
        },
      },
      relayUrl: process.env.NEXT_PUBLIC_WALLET_CONNECT_RELAY_URL || "wss://relay.walletconnect.com",
    },
  },

  // Database configuration. The schema itself is declared version by version
  // in `PenguiDB` (src/shared/lib/database/indexedDB.ts); bump this alongside
  // the highest `this.version(n)` there.
  database: {
    indexedDB: {
      name: "pengui-db",
      version: 5,
    },
  },
} as const;

/**
 * Get native token ticker for a specific network
 * @param network - The network type ('mainnet' | 'testnet')
 * @returns 'TXCH' for testnet, 'XCH' for mainnet
 */
export function getNativeTokenTickerForNetwork(network: "mainnet" | "testnet"): "TXCH" | "XCH" {
  return network === "testnet" ? "TXCH" : "XCH";
}

/**
 * Check if a network is testnet
 * @param network - The network type ('mainnet' | 'testnet')
 * @returns true if testnet, false if mainnet
 */
export function isNetworkTestnet(network: "mainnet" | "testnet"): boolean {
  return network === "testnet";
}

export type Environment = typeof environment;
