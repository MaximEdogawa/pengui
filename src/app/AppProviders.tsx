"use client";

import ReactQueryProvider from "@/shared/providers/ReactQueryProvider";
import { NetworkProvider } from "@/shared/providers/NetworkProvider";
import {
  WalletRuntimeKindProvider,
  WalletRuntimeProvider,
  useWalletRuntimeKind,
} from "@/shared/providers/WalletRuntimeProvider";
import { DashboardLayout } from "@/features/dashboard";
import { WalletConnectionGuard, ErrorBoundary } from "@/shared/ui";
import { isLoginPath } from "@/shared/lib/routes/appPath";
import { applyWebSocketBufferedAmountPatch } from "@/shared/lib/websocketBufferedAmountPatch";
import { store } from "@maximedogawa/chia-wallet-connect-react";
import { ThemeProvider } from "next-themes";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Provider } from "react-redux";
import { logger } from "@/shared/lib/logger";
import { hasNetworkPreference, setStoredNetwork } from "@/shared/lib/utils/networkStorage";
import { NetworkFilterSync } from "./NetworkFilterSync";
import { NavigationProgressProvider } from "@/shared/providers/NavigationProgressProvider";
import { NavigationQueryCleanup } from "@/shared/providers/NavigationQueryCleanup";
import { WalletConnectBootstrap } from "./WalletConnectBootstrap";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  // Run client-only patches as early as possible
  useEffect(() => {
    applyWebSocketBufferedAmountPatch();
  }, []);

  // Initialize network preference to mainnet on mount (before any wallet operations)
  useEffect(() => {
    if (typeof window !== "undefined" && !hasNetworkPreference()) {
      setStoredNetwork("mainnet");
    }
  }, []);

  // Initialize IndexedDB (offer persistence) on mount — transport independent
  useEffect(() => {
    if (typeof window === "undefined") return;
    import("@/shared/lib/database/indexedDB").then(({ initializeDatabase }) => {
      initializeDatabase().catch(() => {
        logger.error("IndexedDB initialization failed. Offers may not persist.");
      });
    });
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <WalletRuntimeKindProvider>
        <Provider store={store}>
          <WalletTransportBootstrap>
            <ErrorBoundary>
              <div className="wallet-connect-scope">
                <NavigationProgressProvider>
                  <ReactQueryProvider>
                    <NavigationQueryCleanup />
                    <NetworkProvider>
                      <WalletRuntimeProvider>
                        <NetworkFilterSync />
                        <WalletConnectionGuard>
                          <DashboardLayoutWrapper>{children}</DashboardLayoutWrapper>
                        </WalletConnectionGuard>
                      </WalletRuntimeProvider>
                    </NetworkProvider>
                  </ReactQueryProvider>
                </NavigationProgressProvider>
              </div>
            </ErrorBoundary>
          </WalletTransportBootstrap>
        </Provider>
      </WalletRuntimeKindProvider>
    </ThemeProvider>
  );
}

/**
 * Transport-specific bootstrapping.
 *
 * WalletConnect needs redux-persist rehydration, session restoration, the
 * WalletManager event bridge and relay error suppression. Inside Sage none of
 * that exists — the host is the wallet — so the Sage branch just renders the
 * tree (TASK-001.02 adds the bridge initialisation there).
 */
function WalletTransportBootstrap({ children }: { children: React.ReactNode }) {
  const runtimeKind = useWalletRuntimeKind();

  if (runtimeKind === "walletconnect") {
    return <WalletConnectBootstrap>{children}</WalletConnectBootstrap>;
  }

  return <>{children}</>;
}

function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = isLoginPath(pathname);

  if (isLoginPage) {
    return <>{children}</>;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
