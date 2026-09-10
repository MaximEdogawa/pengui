"use client";

import {
  WalletManager,
  persistor,
  restoreConnectionStateImmediate,
  store,
} from "@maximedogawa/chia-wallet-connect-react";
import { useEffect } from "react";
import { PersistGate } from "redux-persist/integration/react";
import { logger } from "@/shared/lib/logger";
import { getWalletConnectAppMetadata } from "@/shared/lib/wallet/walletconnect/connectWalletConnect";
import {
  getStoredNetwork,
  hasNetworkPreference,
  setStoredNetwork,
} from "@/shared/lib/utils/networkStorage";
import { networkToChainId } from "@/shared/lib/utils/networkUtils";
import { PersistGateLoadingFallback } from "./PersistGateLoadingFallback";

const PERSIST_LIFT_TIMEOUT_MS = 10_000;

/**
 * WalletConnect-only bootstrapping, mounted by `AppProviders` when the detected
 * wallet runtime is `walletconnect`.
 *
 * Covers redux-persist rehydration, stale `walletconnect` storage cleanup,
 * session restoration, the WalletManager event bridge and relay error
 * suppression. None of it applies inside the Sage app webview.
 */
export function WalletConnectBootstrap({ children }: { children: React.ReactNode }) {
  // Suppress WalletConnect relay timing errors (relay sends session_request/session_ping after UI moved on)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isWcRelayNoListeners = (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      return msg.includes("without any listeners") && msg.includes("session_");
    };
    const prevOnError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      if (isWcRelayNoListeners(error ?? message)) return true;
      return prevOnError
        ? prevOnError(message, source ?? "", lineno ?? 0, colno ?? 0, error ?? undefined)
        : false;
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      if (isWcRelayNoListeners(event.reason)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.onerror = prevOnError;
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  // Initialize WalletManager on mount
  // CRITICAL: Ensure network is set before WalletManager initialization
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // Ensure network preference is set before WalletManager initialization
    if (!hasNetworkPreference()) {
      setStoredNetwork("mainnet");
    }

    try {
      const { penguiIcon, metadata } = getWalletConnectAppMetadata();
      const walletManager = new WalletManager(penguiIcon, metadata);
      walletManager.detectEvents();
    } catch (error) {
      logger.error("❌ Failed to initialize WalletManager:", error);
      // Don't throw - let ErrorBoundary handle render errors
    }
  }, []);

  return (
    <PersistGate
      loading={<PersistGateLoadingFallback />}
      persistor={persistor}
      onBeforeLift={restoreWalletConnectSession}
    >
      {children}
    </PersistGate>
  );
}

/**
 * Restore the persisted WalletConnect session once redux-persist rehydrated,
 * skipping restoration when the stored session belongs to another network.
 */
async function restoreWalletConnectSession(): Promise<void> {
  // Ensure network preference is set to mainnet by default
  if (!hasNetworkPreference()) {
    setStoredNetwork("mainnet");
  }

  const appNetwork = getStoredNetwork();
  const appChainId = networkToChainId(appNetwork);

  // Clear WalletConnect storage if it contains testnet references when app is on mainnet
  if (typeof window !== "undefined" && appNetwork === "mainnet") {
    try {
      const wcStorage = localStorage.getItem("walletconnect");
      if (wcStorage && (wcStorage.includes("testnet") || wcStorage.includes("chia:testnet"))) {
        localStorage.removeItem("walletconnect");
      }
    } catch {
      // Silently handle storage errors
    }
  }

  // Restore connection state after Redux Persist has rehydrated
  const { penguiIcon, metadata } = getWalletConnectAppMetadata();
  const state = store.getState();
  const storedSession = state.walletConnect?.selectedSession;

  // Check if stored session's chainId matches app's network
  if (storedSession?.namespaces?.chia) {
    let storedChainId: string | null = storedSession.namespaces.chia.chains?.[0] || null;

    if (!storedChainId && storedSession.namespaces.chia.accounts?.[0]) {
      const accountParts = storedSession.namespaces.chia.accounts[0].split(":");
      if (accountParts.length >= 3) {
        storedChainId = `chia:${accountParts[1] === "chia" ? accountParts[2] : accountParts[1]}`;
      }
    }

    // Skip restoration if chainId doesn't match
    if (storedChainId && storedChainId !== appChainId) {
      return;
    }
  }

  try {
    const restorePromise = (async () => {
      await restoreConnectionStateImmediate({
        walletConnectIcon: penguiIcon,
        walletConnectMetadata: metadata,
      });
      const walletManager = new WalletManager(penguiIcon, metadata);
      await walletManager.detectEvents();
    })();

    const timeoutPromise = new Promise<"timeout">((resolve) => {
      setTimeout(() => resolve("timeout"), PERSIST_LIFT_TIMEOUT_MS);
    });

    const result = await Promise.race([
      restorePromise.then(() => "done" as const),
      timeoutPromise,
    ]).catch((error) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("chainId") || errorMessage.includes("isValidRequest")) {
        return "done";
      }
      logger.warn("Wallet restoration failed:", errorMessage);
      return "done";
    });

    if (result === "timeout") {
      logger.warn("Wallet restoration timed out; user can disconnect from wallet menu if needed.");
    }
  } catch (error) {
    // Only re-throw non-chainId errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (!errorMessage.includes("chainId") && !errorMessage.includes("isValidRequest")) {
      throw error;
    }
  }
}
