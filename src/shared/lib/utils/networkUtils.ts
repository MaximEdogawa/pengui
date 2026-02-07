/**
 * Network utility functions for converting between chain IDs and network types
 */

export const CHIA_MAINNET_CHAIN_ID = 'chia:mainnet'
export const CHIA_TESTNET_CHAIN_ID = 'chia:testnet'

/**
 * Convert a chain ID to network type
 * @param chainId - The chain ID (e.g., 'chia:mainnet' or 'chia:testnet')
 * @returns The network type ('mainnet' or 'testnet')
 */
export function chainIdToNetwork(chainId: string): 'mainnet' | 'testnet' {
  if (chainId === CHIA_MAINNET_CHAIN_ID) {
    return 'mainnet'
  }
  if (chainId === CHIA_TESTNET_CHAIN_ID) {
    return 'testnet'
  }
  // Default to mainnet if unknown
  return 'mainnet'
}

/**
 * Convert a network type to chain ID
 * @param network - The network type ('mainnet' or 'testnet')
 * @returns The chain ID (e.g., 'chia:mainnet' or 'chia:testnet')
 */
export function networkToChainId(network: 'mainnet' | 'testnet'): string {
  return network === 'mainnet' ? CHIA_MAINNET_CHAIN_ID : CHIA_TESTNET_CHAIN_ID;
}

/**
 * Get Dexie API URL for a given network
 * @param network - The network type ('mainnet' or 'testnet')
 * @returns The Dexie API base URL
 */
export function getDexieApiUrl(network: 'mainnet' | 'testnet'): string {
  return network === 'mainnet'
    ? process.env.NEXT_PUBLIC_DEXIE_MAINNET_API_URL || 'https://api.dexie.space'
    : process.env.NEXT_PUBLIC_DEXIE_TESTNET_API_URL || 'https://api-testnet.dexie.space';
}

function isAbsoluteWsUrl(url: string): boolean {
  return (
    typeof url === 'string' &&
    (url.startsWith('ws://') || url.startsWith('wss://'))
  );
}

/** Development: connect to relay on localhost:9090 (mainnet) or :9091 (testnet). Run `bun run relay` / `bun run relay:testnet`. */
export const DEFAULT_RELAY_MAINNET_WS = 'ws://localhost:9090';
export const DEFAULT_RELAY_TESTNET_WS = 'ws://localhost:9091';

function isLocalhostForRelay(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const host = window.location?.hostname ?? '';
    return host === 'localhost' || host === '127.0.0.1';
  } catch {
    return false;
  }
}

/**
 * Splash relay WebSocket URL for the given network.
 * Set via env (e.g. NEXT_PUBLIC_DEXIE_SPLASH_RELAY_WS_URL); run splash-relay or another libp2p relay.
 * When running on localhost (dev or production build), defaults to local relay so the stream
 * auto-connects without configuring env.
 *
 * @returns Relay URL (ws:// or wss://), or '' so the stream uses REST only.
 */
export function getDexieSplashRelayUrl(network: 'mainnet' | 'testnet'): string {
  const u =
    network === 'mainnet'
      ? process.env.NEXT_PUBLIC_DEXIE_SPLASH_RELAY_MAINNET_WS_URL ||
        process.env.NEXT_PUBLIC_DEXIE_SPLASH_RELAY_WS_URL
      : process.env.NEXT_PUBLIC_DEXIE_SPLASH_RELAY_TESTNET_WS_URL ||
        process.env.NEXT_PUBLIC_DEXIE_SPLASH_RELAY_WS_URL;
  if (isAbsoluteWsUrl(u ?? '')) return u!;
  // In development, default to local relay so stream auto-connects (run `bun run relay` / `relay:testnet`)
  if (process.env.NODE_ENV === 'development') {
    return network === 'mainnet' ? DEFAULT_RELAY_MAINNET_WS : DEFAULT_RELAY_TESTNET_WS;
  }
  // Production build opened on localhost: use local relay when no env set (safe: window check is client-only)
  if (isLocalhostForRelay()) {
    return network === 'mainnet' ? DEFAULT_RELAY_MAINNET_WS : DEFAULT_RELAY_TESTNET_WS;
  }
  return '';
}

/**
 * Whether the current relay URL is the dev/localhost default (no env configured).
 * Use in UI to show "Using local relay" when auto-connected for testing.
 */
export function isDefaultLocalRelayUrl(network: 'mainnet' | 'testnet'): boolean {
  const u =
    network === 'mainnet'
      ? process.env.NEXT_PUBLIC_DEXIE_SPLASH_RELAY_MAINNET_WS_URL ||
        process.env.NEXT_PUBLIC_DEXIE_SPLASH_RELAY_WS_URL
      : process.env.NEXT_PUBLIC_DEXIE_SPLASH_RELAY_TESTNET_WS_URL ||
        process.env.NEXT_PUBLIC_DEXIE_SPLASH_RELAY_WS_URL;
  if (isAbsoluteWsUrl(u ?? '')) return false;
  return process.env.NODE_ENV === 'development' || isLocalhostForRelay();
}

/**
 * Get Space Scan API URL
 * Note: Space Scan uses the same API for both mainnet and testnet tokens
 * @returns The Space Scan API base URL
 */
export function getSpaceScanApiUrl(): string {
  return process.env.NEXT_PUBLIC_SPACESCAN_API_URL || 'https://api.spacescan.io';
}
