/**
 * LoginForm story — imported by login-form.ct.spec.tsx.
 *
 * Playwright CT requires mountable components to live outside the test file,
 * and props must be JSON-serialisable (they cross the test-runner → browser
 * boundary), which is why the mock Sage host is configured with plain data
 * and installed here, inside the browser, rather than in the spec.
 *
 * Mirrors `src/test-utils/render-with-providers.tsx` without Testing Library:
 * theme → runtime kind → redux store → query client → network → wallet runtime.
 */
import { useState, type ReactNode } from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { persistor, store } from "@maximedogawa/chia-wallet-connect-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import LoginForm from "@/features/auth/ui/LoginForm";
import type { WalletRuntimeKind } from "@/shared/lib/wallet/types";
import { NetworkProvider } from "@/shared/providers/NetworkProvider";
import {
  WalletRuntimeKindProvider,
  WalletRuntimeProvider,
} from "@/shared/providers/WalletRuntimeProvider";
import { installMockSageBridge, type MockSageBridgeOptions } from "@/test-utils/mocks/sageBridge";

export interface LoginFormStoryProps {
  /** Which wallet transport the login screen should believe it runs on. */
  runtime: WalletRuntimeKind;
  /** Mock Sage host configuration; only read when `runtime` is `sage-bridge`. */
  sage?: MockSageBridgeOptions;
}

function Providers({ runtime, children }: { runtime: WalletRuntimeKind; children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, staleTime: Infinity },
          mutations: { retry: false },
        },
      })
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      <WalletRuntimeKindProvider runtime={runtime}>
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <QueryClientProvider client={queryClient}>
              <NetworkProvider>
                <WalletRuntimeProvider runtime={runtime}>{children}</WalletRuntimeProvider>
              </NetworkProvider>
            </QueryClientProvider>
          </PersistGate>
        </Provider>
      </WalletRuntimeKindProvider>
    </ThemeProvider>
  );
}

export function LoginFormStory({ runtime, sage }: LoginFormStoryProps) {
  // Install the mock host before any child runs an effect: `useState`'s
  // initialiser executes during the first render of this component, ahead of
  // NetworkProvider's Sage network fetch and SageBridgeRuntime's initialize().
  useState(() => {
    if (runtime === "sage-bridge") installMockSageBridge(sage);
    return true;
  });

  return (
    <Providers runtime={runtime}>
      <LoginForm />
    </Providers>
  );
}
