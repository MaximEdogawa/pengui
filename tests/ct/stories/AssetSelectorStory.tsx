/**
 * AssetSelector story — imported by asset-selector.ct.spec.tsx.
 *
 * Playwright CT requires mountable components to live outside the test file, and props
 * must be JSON-serialisable (they cross the test-runner → browser boundary), so the
 * token list is passed as plain data and the selected asset is held in state here.
 *
 * The component is a controlled input: the parent owns the `ExtendedAsset` and feeds it
 * back through `onUpdate`. That round trip is exactly what these tests exercise, so the
 * story keeps the real state shape rather than stubbing `onUpdate`.
 *
 * The provider stack mirrors `LoginFormStory` because the selector reaches for three
 * things indirectly: `TickerIcon` (rendered once a token is chosen) fetches through
 * TanStack Query, the dropdown's `AssetList` branch calls `useNetwork`, and
 * `NetworkProvider` in turn needs the wallet runtime and the redux store.
 *
 * A `data-testid="asset-state"` mirror renders the live asset as JSON, which lets a spec
 * assert on the model (the `type`/`assetId` pair) and not only on what is painted.
 */
"use client";

import { useState, type ReactNode } from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { persistor, store } from "@maximedogawa/chia-wallet-connect-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { NetworkProvider } from "@/shared/providers/NetworkProvider";
import {
  WalletRuntimeKindProvider,
  WalletRuntimeProvider,
} from "@/shared/providers/WalletRuntimeProvider";
import AssetSelector, {
  type ExtendedAsset,
  type TokenInfo,
} from "@/shared/ui/forms/asset-selector/AssetSelector";
import type { AssetType } from "@/entities/offer";

export interface AssetSelectorStoryProps {
  /** Tokens the dropdown offers. XCH is the entry with an empty `assetId`. */
  tokens?: TokenInfo[];
  /** Initial asset type. Defaults to `cat`, the unified token-search mode. */
  initialType?: AssetType;
  /** Which type options the selector exposes. */
  enabledAssetTypes?: AssetType[];
  /**
   * Render the dropdown's AssetList branch, which is what the trading create-offer form
   * uses (`useAssetListForDropdown`). The two branches have separate click handlers, so
   * both need covering.
   */
  useAssetList?: boolean;
}

const DEFAULT_TOKENS: TokenInfo[] = [
  { assetId: "", ticker: "XCH", name: "Chia" },
  { assetId: "a".repeat(64), ticker: "USDS", name: "Stably USD" },
  { assetId: "b".repeat(64), ticker: "DBX", name: "dexie bucks" },
];

function Providers({ children }: { children: ReactNode }) {
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
      <WalletRuntimeKindProvider runtime="walletconnect">
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <QueryClientProvider client={queryClient}>
              <NetworkProvider>
                <WalletRuntimeProvider runtime="walletconnect">{children}</WalletRuntimeProvider>
              </NetworkProvider>
            </QueryClientProvider>
          </PersistGate>
        </Provider>
      </WalletRuntimeKindProvider>
    </ThemeProvider>
  );
}

export default function AssetSelectorStory({
  tokens = DEFAULT_TOKENS,
  initialType = "cat",
  enabledAssetTypes = ["xch", "cat", "nft", "option"],
  useAssetList = false,
}: AssetSelectorStoryProps) {
  const [asset, setAsset] = useState<ExtendedAsset>({
    type: initialType,
    assetId: "",
    amount: 0,
    symbol: "",
  } as ExtendedAsset);

  return (
    <Providers>
      <div className="p-4">
        <AssetSelector
          asset={asset}
          onUpdate={setAsset}
          availableTokens={tokens}
          enabledAssetTypes={enabledAssetTypes}
          showRemoveButton={false}
          useAssetListForDropdown={useAssetList}
        />
        <pre data-testid="asset-state">
          {JSON.stringify({
            type: asset.type,
            assetId: asset.assetId,
            symbol: asset.symbol,
            searchQuery: asset.searchQuery ?? "",
          })}
        </pre>
      </div>
    </Providers>
  );
}
