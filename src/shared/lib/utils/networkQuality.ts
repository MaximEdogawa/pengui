/**
 * Network quality detection using Navigator.connection API.
 * Provides adaptive configuration so the app degrades gracefully on 3G / slow connections.
 */

export type ConnectionSpeed = "slow" | "medium" | "fast";

interface NetworkConnection {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

function getConnection(): NetworkConnection | null {
  if (typeof navigator === "undefined") return null;
  return (
    (navigator as unknown as { connection?: NetworkConnection }).connection ??
    (navigator as unknown as { mozConnection?: NetworkConnection }).mozConnection ??
    (navigator as unknown as { webkitConnection?: NetworkConnection }).webkitConnection ??
    null
  );
}

export function getConnectionSpeed(): ConnectionSpeed {
  const conn = getConnection();
  if (!conn) return "fast";

  if (conn.saveData) return "slow";

  const etype = conn.effectiveType;
  if (etype === "slow-2g" || etype === "2g" || etype === "3g") return "slow";
  if (etype === "4g" && (conn.downlink ?? 10) < 2) return "medium";
  if (etype === "4g") return "fast";

  if (typeof conn.rtt === "number" && conn.rtt > 500) return "slow";
  if (typeof conn.rtt === "number" && conn.rtt > 200) return "medium";

  return "fast";
}

export interface AdaptiveConfig {
  batchSize: number;
  batchDelayMs: number;
  maxCatsToCheck: number;
  fetchTimeoutMs: number;
  retryCount: number;
  retryDelay: number;
  healthCheckIntervalMs: number;
  healthCheckPingTimeoutMs: number;
  staleTimeMs: number;
  gcTimeMs: number;
}

const CONFIGS: Record<ConnectionSpeed, AdaptiveConfig> = {
  slow: {
    batchSize: 2,
    batchDelayMs: 3000,
    maxCatsToCheck: 15,
    fetchTimeoutMs: 45_000,
    retryCount: 3,
    retryDelay: 3000,
    healthCheckIntervalMs: 120_000,
    healthCheckPingTimeoutMs: 30_000,
    staleTimeMs: 5 * 60 * 1000,
    gcTimeMs: 30 * 60 * 1000,
  },
  medium: {
    batchSize: 3,
    batchDelayMs: 2000,
    maxCatsToCheck: 30,
    fetchTimeoutMs: 30_000,
    retryCount: 2,
    retryDelay: 2000,
    healthCheckIntervalMs: 90_000,
    healthCheckPingTimeoutMs: 20_000,
    staleTimeMs: 3 * 60 * 1000,
    gcTimeMs: 15 * 60 * 1000,
  },
  fast: {
    batchSize: 5,
    batchDelayMs: 1500,
    maxCatsToCheck: 50,
    fetchTimeoutMs: 15_000,
    retryCount: 1,
    retryDelay: 1000,
    healthCheckIntervalMs: 60_000,
    healthCheckPingTimeoutMs: 15_000,
    staleTimeMs: 60 * 1000,
    gcTimeMs: 5 * 60 * 1000,
  },
};

export function getAdaptiveConfig(): AdaptiveConfig {
  return CONFIGS[getConnectionSpeed()];
}

export function onConnectionChange(cb: (speed: ConnectionSpeed) => void): () => void {
  const conn = getConnection();
  if (!conn?.addEventListener) return () => {};
  const handler = () => cb(getConnectionSpeed());
  conn.addEventListener("change", handler);
  return () => conn.removeEventListener?.("change", handler);
}
