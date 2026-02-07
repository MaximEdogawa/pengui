"use client";

import { useMemo, useEffect, useState, useCallback } from "react";
import { useThemeClasses } from "@/shared/hooks";
import { useNetwork } from "@/shared/hooks/useNetwork";
import { getDexieSplashRelayUrl } from "@/shared/lib/utils/networkUtils";
import TradeHistoryTable from "@/features/trading/ui/widgets/trade-history/TradeHistoryTable";
import { useTradeHistorySorting } from "@/features/trading/hooks/useTradeHistorySorting";
import type { TradeHistoryOfferItem } from "@/features/trading/hooks/useTradeHistory";
import type { OrderBookOrder } from "@/features/trading/lib/orderBookTypes";
import type { DexieOffer } from "@/entities/offer";
import { useSplashWasm } from "@/features/splash-terminal/useSplashWasm";
import { Radio } from "lucide-react";

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
  const [offers, setOffers] = useState<DexieOffer[]>([]);
  const [streamReceived, setStreamReceived] = useState(0);
  const [relayReachable, setRelayReachable] = useState<boolean | null>(null);

  const wasm = useSplashWasm();
  const { sortTrades, sortConfig, setSort } = useTradeHistorySorting();

  // Probe if the relay WebSocket is reachable (raw WS open; libp2p handshake is separate)
  useEffect(() => {
    if (!relayUrl || !relayUrl.startsWith("ws")) return;
    setRelayReachable(null);
    const ws = new WebSocket(relayUrl);
    const tid = setTimeout(() => {
      ws.close();
      setRelayReachable((r) => (r === null ? false : r));
    }, 3000);
    ws.onopen = () => {
      clearTimeout(tid);
      ws.close();
      setRelayReachable(true);
    };
    ws.onerror = () => {
      clearTimeout(tid);
      setRelayReachable((r) => (r === null ? false : r));
    };
    ws.onclose = () => clearTimeout(tid);
    return () => {
      clearTimeout(tid);
      ws.close();
    };
  }, [relayUrl]);

  const appendStreamOffers = useCallback((newOffers: DexieOffer[]) => {
    if (newOffers.length === 0) return;
    setOffers((prev) => {
      const byKey = new Map<string, DexieOffer>();
      for (const o of prev) byKey.set(o.id || o.offer?.slice(0, 64) || String(prev.indexOf(o)), o);
      for (const o of newOffers) {
        const k = o.id || o.offer?.slice(0, 64) || "";
        if (!byKey.has(k)) byKey.set(k, o);
      }
      return Array.from(byKey.values());
    });
    setStreamReceived((n) => n + newOffers.length);
  }, []);

  useEffect(() => {
    wasm.onOffers(appendStreamOffers);
  }, [wasm, appendStreamOffers]);

  useEffect(() => {
    if (!relayUrl) return;
    wasm.initAndConnect(relayUrl, network).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- connect only when relay URL or network changes
  }, [relayUrl, network]);

  const items: TradeHistoryOfferItem[] = useMemo(
    () => offers.map(toTradeHistoryItem),
    [offers],
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
                {streamReceived} offer{streamReceived !== 1 ? "s" : ""} received
              </span>
            </>
          ) : (
            <span className={`text-[10px] sm:text-xs ${t.textSecondary}`}>
              Stream not available
            </span>
          )}
          {relayUrl && (
            <>
              <span className={`text-[9px] sm:text-[10px] ${t.textSecondary} truncate max-w-[180px] sm:max-w-none`} title={relayUrl}>
                {relayUrl}
              </span>
              {relayReachable === false && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400" title="Raw WebSocket to relay failed. Is the relay running (e.g. bun run relay)?">
                  Relay unreachable
                </span>
              )}
              {relayReachable === true && !isConnected && wasm.status === "connecting" && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400" title="WebSocket is open but libp2p handshake has not completed. Check relay and browser console for [Splash] logs.">
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
              {relayUrl
                ? isConnected
                  ? "Waiting for offers…"
                  : wasm.status === "connecting"
                    ? "Connecting…"
                    : "Reconnecting…"
                : "Stream is not configured."}
            </p>
            <p className="text-xs text-center max-w-sm">
              {isConnected ? "New offers will appear here as they’re broadcast." : "Live offers will appear here once connected."}
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
