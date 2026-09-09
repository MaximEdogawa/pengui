"use client";

import { useMemo } from "react";
import { useThemeClasses } from "@/shared/hooks";
import { useNetwork } from "@/shared/hooks/useNetwork";
import { getDexieSplashRelayUrl } from "@/shared/lib/utils/networkUtils";
import TradeHistoryTable from "@/features/trading/ui/widgets/trade-history/TradeHistoryTable";
import { useTradeHistorySorting } from "@/features/trading/hooks/useTradeHistorySorting";
import type { TradeHistoryOfferItem } from "@/features/trading/hooks/useTradeHistory";
import type { OrderBookOrder } from "@/features/trading/lib/orderBookTypes";
import type { DexieOffer } from "@/entities/offer";
import { useSplashConnection } from "@/features/splash-terminal/SplashConnectionProvider";
import { useOrderBookFilterStore } from "@/features/trading/hooks/orderBookFilterStore";
import { useStreamOffers } from "@/features/trading/hooks/StreamOffersProvider";
import { Radio } from "lucide-react";
import { offerMatchesPairFilter } from "@/features/trading/lib/offerPairFilter";

interface StreamContainerProps {
  onOfferClick?: (order: OrderBookOrder) => void;
}

function toTradeHistoryItem(offer: DexieOffer): TradeHistoryOfferItem {
  return {
    offer,
    offerState: "Open",
    isMyOffer: false,
  };
}

export default function StreamContainer({ onOfferClick }: StreamContainerProps) {
  const { t } = useThemeClasses();
  const { network } = useNetwork();
  const relayUrl = getDexieSplashRelayUrl(network);
  // Offers live in StreamOffersProvider (above the view switch) so they survive tab switches.
  const { offers, streamReceived, isSnapshotLoading } = useStreamOffers();

  const buyAssets = useOrderBookFilterStore((s) => s.filters.buyAsset ?? []);
  const sellAssets = useOrderBookFilterStore((s) => s.filters.sellAsset ?? []);

  // Use the shared WASM connection from SplashConnectionProvider
  const wasm = useSplashConnection();
  const { sortTrades, sortConfig, setSort } = useTradeHistorySorting();

  // Only display offers matching the global asset pair filter
  const filteredOffers = useMemo(
    () => offers.filter((o) => offerMatchesPairFilter(o, buyAssets, sellAssets)),
    [offers, buyAssets, sellAssets]
  );

  const items: TradeHistoryOfferItem[] = useMemo(
    () => filteredOffers.map(toTradeHistoryItem),
    [filteredOffers]
  );
  const sortedOffers = useMemo(() => sortTrades(items), [items, sortTrades]);

  const isConnected = wasm.status === "connected";
  const connectionLabel =
    wasm.status === "error"
      ? "Error"
      : wasm.status === "connecting"
        ? "Connecting (WebSocket)…"
        : isConnected
          ? "Connected (WebSocket)"
          : "Disconnected";

  return (
    <div className={`${t.card} h-full flex flex-col overflow-hidden`}>
      {/* Header: WebSocket connection status + stream/parse stats */}
      <div
        className={`flex-shrink-0 flex flex-wrap items-center justify-between gap-2 px-2 py-1.5 sm:px-3 sm:py-2 border-b ${t.border}`}
      >
        {wasm.status === "error" && wasm.error && (
          <p className="w-full text-xs text-red-600 dark:text-red-400 mb-1" title={wasm.error}>
            {wasm.error}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {relayUrl ? (
            <>
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-medium ${
                  isConnected
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    : wasm.status === "error"
                      ? "bg-red-500/20 text-red-600 dark:text-red-400"
                      : "bg-gray-500/20 text-gray-500 dark:text-gray-400"
                }`}
              >
                <Radio className="w-3 h-3" />
                {connectionLabel}
              </span>
              <span className={`text-[10px] sm:text-xs ${t.textSecondary}`}>
                {filteredOffers.length} of {offers.length} offer{offers.length !== 1 ? "s" : ""}
                {streamReceived > 0 ? ` (${streamReceived} streamed)` : ""}
              </span>
            </>
          ) : (
            <span className={`text-[10px] sm:text-xs ${t.textSecondary}`}>
              Stream not available
            </span>
          )}
          {relayUrl && (
            <>
              <span
                className={`text-[9px] sm:text-[10px] ${t.textSecondary} truncate max-w-[180px] sm:max-w-none`}
                title={relayUrl}
              >
                {relayUrl}
              </span>
              {!isConnected && wasm.status === "connecting" && (
                <span
                  className="text-[10px] text-amber-600 dark:text-amber-400"
                  title="WebSocket is open but libp2p handshake has not completed. Check relay and browser console for [Splash] logs."
                >
                  Handshake…
                </span>
              )}
            </>
          )}
        </div>
      </div>
      {/* Table or empty state */}
      <div className="flex-1 min-h-0 overflow-auto">
        {sortedOffers.length === 0 ? (
          <div
            className={`flex flex-col items-center justify-center h-full gap-1 px-4 ${t.textSecondary}`}
          >
            <p className="text-sm">
              {isSnapshotLoading
                ? "Loading offers…"
                : relayUrl
                  ? isConnected
                    ? "Waiting for offers…"
                    : wasm.status === "connecting"
                      ? "Connecting…"
                      : "Reconnecting…"
                  : "Stream is not configured."}
            </p>
            <p className="text-xs text-center max-w-sm">
              {isConnected
                ? "New offers will appear here as they’re broadcast."
                : "Live offers will appear here once connected."}
            </p>
          </div>
        ) : (
          <TradeHistoryTable
            offers={sortedOffers}
            sortConfig={sortConfig}
            onSort={setSort}
            onOfferClick={onOfferClick}
          />
        )}
      </div>
    </div>
  );
}
