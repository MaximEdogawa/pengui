/**
 * Test utility to render components with all necessary providers
 * Mimics the app's provider structure for testing
 */

import React, { type ReactElement } from "react";
import { render, type RenderOptions, cleanup } from "@testing-library/react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "@maximedogawa/chia-wallet-connect-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NetworkProvider } from "@/shared/providers/NetworkProvider";
import {
  WalletRuntimeKindProvider,
  WalletRuntimeProvider,
} from "@/shared/providers/WalletRuntimeProvider";
import type { WalletRuntimeKind } from "@/shared/lib/wallet/types";
import { ThemeProvider } from "next-themes";

// Create a test QueryClient with default options
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface AllTheProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
  /** Force a wallet transport; defaults to detection (WalletConnect in tests). */
  walletRuntime?: WalletRuntimeKind;
}

export function AllTheProviders({
  children,
  queryClient = createTestQueryClient(),
  walletRuntime,
}: AllTheProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <WalletRuntimeKindProvider runtime={walletRuntime}>
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <QueryClientProvider client={queryClient}>
              <NetworkProvider>
                <WalletRuntimeProvider runtime={walletRuntime}>{children}</WalletRuntimeProvider>
              </NetworkProvider>
            </QueryClientProvider>
          </PersistGate>
        </Provider>
      </WalletRuntimeKindProvider>
    </ThemeProvider>
  );
}

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  queryClient?: QueryClient;
  walletRuntime?: WalletRuntimeKind;
}

export function renderWithProviders(
  ui: ReactElement,
  { queryClient, walletRuntime, ...renderOptions }: CustomRenderOptions = {}
) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AllTheProviders queryClient={queryClient} walletRuntime={walletRuntime}>
      {children}
    </AllTheProviders>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Re-export everything from @testing-library/react
export * from "@testing-library/react";

// Override render method
export { renderWithProviders as render, cleanup };
