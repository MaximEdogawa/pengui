"use client";

import ReactQueryProvider from "@/shared/providers/ReactQueryProvider";
import { NetworkProvider } from "@/shared/providers/NetworkProvider";
import { DashboardLayout } from "@/features/dashboard";
import { WalletConnectionGuard, ErrorBoundary } from "@/shared/ui";
import { applyWebSocketBufferedAmountPatch } from "@/shared/lib/websocketBufferedAmountPatch";
import {
  WalletManager,
  persistor,
  restoreConnectionStateImmediate,
  store,
} from "@maximedogawa/chia-wallet-connect-react";
import { ThemeProvider } from "next-themes";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { logger } from "@/shared/lib/logger";
import {
  getStoredNetwork,
  hasNetworkPreference,
  setStoredNetwork,
} from "@/shared/lib/utils/networkStorage";
import { networkToChainId } from "@/shared/lib/utils/networkUtils";
import { NetworkFilterSync } from "./NetworkFilterSync";
import { NavigationProgressProvider } from "@/shared/providers/NavigationProgressProvider";
import { NavigationQueryCleanup } from "@/shared/providers/NavigationQueryCleanup";
import { PersistGateLoadingFallback } from "./PersistGateLoadingFallback";

// Wallet metadata configuration (shared between WalletManager and restoreConnectionState)
const getWalletConnectConfig = () => {
  if (typeof window === "undefined") {
    return {
      penguiIcon: "/pengui-logo.png",
      metadata: {
        name: "Pengui",
        description: "Pengui - Decentralized lending platform on Chia Network",
        url: process.env.NEXT_PUBLIC_APP_URL || "https://penguinpool.space",
        icons: ["/pengui-logo.png"],
      },
    };
  }

  const penguiIcon = `${window.location.origin}/pengui-logo.png`;
  return {
    penguiIcon,
    metadata: {
      name: "Pengui",
      description: "Pengui - Decentralized lending platform on Chia Network",
      url: window.location.origin,
      icons: [penguiIcon],
    },
  };
};

export default function AppProviders({ children }: { children: React.ReactNode }) {
  // Run client-only patches as early as possible
  useEffect(() => {
    applyWebSocketBufferedAmountPatch();
  }, []);

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

  // Initialize network preference to mainnet on mount (before any WalletConnect operations)
  useEffect(() => {
    if (typeof window !== "undefined" && !hasNetworkPreference()) {
      setStoredNetwork("mainnet");
    }
  }, []);

  // Initialize WalletManager and database on mount
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
      const { penguiIcon, metadata } = getWalletConnectConfig();
      const walletManager = new WalletManager(penguiIcon, metadata);
      walletManager.detectEvents();

      // Initialize IndexedDB
      import("@/shared/lib/database/indexedDB").then(
        ({ initializeDatabase }) => {
          initializeDatabase().catch(() => {
            logger.error(
              "IndexedDB initialization failed. Offers may not persist.",
            );
          });
        },
      );
    } catch (error) {
      logger.error("❌ Failed to initialize WalletManager:", error);
      // Don't throw - let ErrorBoundary handle render errors
    }
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <Provider store={store}>
          <PersistGate
            loading={<PersistGateLoadingFallback />}
            persistor={persistor}
            onBeforeLift={async () => {
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
                  if (
                    wcStorage &&
                    (wcStorage.includes("testnet") ||
                      wcStorage.includes("chia:testnet"))
                  ) {
                    localStorage.removeItem("walletconnect");
                  }
                } catch {
                  // Silently handle storage errors
                }
              }

              // Restore connection state after Redux Persist has rehydrated
              const { penguiIcon, metadata } = getWalletConnectConfig();
              const state = store.getState();
              const storedSession = state.walletConnect?.selectedSession;

              // Check if stored session's chainId matches app's network
              if (storedSession?.namespaces?.chia) {
                let storedChainId: string | null =
                  storedSession.namespaces.chia.chains?.[0] || null;

                if (
                  !storedChainId &&
                  storedSession.namespaces.chia.accounts?.[0]
                ) {
                  const accountParts =
                    storedSession.namespaces.chia.accounts[0].split(":");
                  if (accountParts.length >= 3) {
                    storedChainId = `chia:${accountParts[1] === "chia" ? accountParts[2] : accountParts[1]}`;
                  }
                }

                // Skip restoration if chainId doesn't match
                if (storedChainId && storedChainId !== appChainId) {
                  return;
                }
              }

              const PERSIST_LIFT_TIMEOUT_MS = 10_000;

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
                  const errorMessage =
                    error instanceof Error ? error.message : String(error);
                  if (
                    errorMessage.includes("chainId") ||
                    errorMessage.includes("isValidRequest")
                  ) {
                    return "done";
                  }
                  logger.warn("Wallet restoration failed:", errorMessage);
                  return "done";
                });

                if (result === "timeout") {
                  logger.warn(
                    "Wallet restoration timed out; user can disconnect from wallet menu if needed.",
                  );
                }
              } catch (error) {
                // Only re-throw non-chainId errors
                const errorMessage =
                  error instanceof Error ? error.message : String(error);
                if (
                  !errorMessage.includes("chainId") &&
                  !errorMessage.includes("isValidRequest")
                ) {
                  throw error;
                }
              }
            }}
          >
            <ErrorBoundary>
              <div className="wallet-connect-scope">
                <NavigationProgressProvider>
                  <ReactQueryProvider>
                    <NavigationQueryCleanup />
                    <NetworkProvider>
                      <NetworkFilterSync />
                      <WalletConnectionGuard>
                        <DashboardLayoutWrapper>
                          {children}
                        </DashboardLayoutWrapper>
                      </WalletConnectionGuard>
                    </NetworkProvider>
                  </ReactQueryProvider>
                </NavigationProgressProvider>
              </div>
            </ErrorBoundary>
          </PersistGate>
        </Provider>
      </ThemeProvider>
  );
}

function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login" || pathname === "/";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
