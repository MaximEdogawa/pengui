"use client";

import { logger } from "@/shared/lib/logger";
import { getAdaptiveConfig } from "@/shared/lib/utils/networkQuality";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useWalletProvider, useWalletState } from "@/shared/providers/WalletRuntimeProvider";

/**
 * Monitors wallet connection health. Shows "connection lost" only after 2 consecutive
 * failed pings so transient blips (suspend, relay lag) don't trigger the modal.
 * Adapts ping frequency and timeout to network quality.
 */
export function useWalletConnectionHealthCheck() {
  const provider = useWalletProvider();
  const { isConnected } = useWalletState();
  const [connectionLost, setConnectionLost] = useState(false);
  const isCheckingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const failCountRef = useRef(0);

  const netCfg = useMemo(() => getAdaptiveConfig(), []);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (isCheckingRef.current) return true;
    isCheckingRef.current = true;
    try {
      const result = await provider.ping({ timeoutMs: netCfg.healthCheckPingTimeoutMs });
      if (result.success) return true;

      // The transport is not usable yet (no client / no session): not a failure.
      if (result.code === "not-connected") return true;

      if (result.code === "session-missing") {
        logger.warn("Wallet health check: session no longer exists locally");
        return false;
      }

      const msg = result.error ?? "";
      const isSessionError =
        msg.includes("No matching key") ||
        msg.includes("Missing or invalid") ||
        msg.includes("session") ||
        msg.includes("Ping timeout");
      if (isSessionError) logger.warn(`Wallet health check failed: ${msg}`);
      return !isSessionError;
    } finally {
      isCheckingRef.current = false;
    }
  }, [provider, netCfg.healthCheckPingTimeoutMs]);

  const runHealthCheck = useCallback(async () => {
    if (!isConnected) return;
    const ok = await checkConnection();
    if (ok) {
      failCountRef.current = 0;
    } else {
      failCountRef.current += 1;
      if (failCountRef.current >= 2) setConnectionLost(true);
    }
  }, [checkConnection, isConnected]);

  useEffect(() => {
    if (!isConnected) {
      setConnectionLost(false);
      failCountRef.current = 0;
    }
  }, [isConnected]);

  // When health check detects connection lost, only notify; do NOT auto-redirect (user must click Disconnect)
  useEffect(() => {
    if (!connectionLost) return;
    toast.error("Wallet connection lost. Use Disconnect in the wallet menu to reconnect.");
    logger.info("Wallet connection lost; user can disconnect from wallet menu to reconnect");
  }, [connectionLost]);

  useEffect(() => {
    if (!isConnected) return;
    const t = setTimeout(() => runHealthCheck(), 15_000);
    return () => clearTimeout(t);
  }, [isConnected, runHealthCheck]);

  useEffect(() => {
    if (!isConnected) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        setTimeout(runHealthCheck, 5000);
      }
    };
    const onOnline = () => setTimeout(runHealthCheck, 5000);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [isConnected, runHealthCheck]);

  useEffect(() => {
    if (!isConnected) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }
    intervalRef.current = setInterval(() => {
      if (document.visibilityState === "visible") runHealthCheck();
    }, netCfg.healthCheckIntervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [isConnected, runHealthCheck, netCfg.healthCheckIntervalMs]);

  return { connectionLost };
}
