"use client";

import { useCallback, useRef, useState } from "react";
import type { DexieOffer } from "@/entities/offer";
import { getDexieApiUrl } from "@/shared/lib/utils/networkUtils";

export type SplashConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

const MAX_BUFFER_LEN = 10_000;

function isValidRelayUrl(url: unknown): url is string {
  return (
    typeof url === "string" &&
    (url.startsWith("ws://") || url.startsWith("wss://"))
  );
}

interface SplashOfferPayload {
  offer: string;
  peer_id: string;
  timestamp: number;
}

function toMinimalDexieOffer(p: SplashOfferPayload): DexieOffer {
  return {
    id: "",
    maker: "",
    status: 0,
    offer: p.offer,
    date_found: new Date(p.timestamp).toISOString(),
    price: 0,
    offered: [],
    requested: [],
    fees: 0,
  };
}

interface SplashWasmModule {
  init: (relayUrl: string, network: string) => void;
  connect: () => void;
  disconnect: () => void;
  setOnOffersCallback: (cb: (offers: unknown) => void) => void;
  setOnStatusCallback: (cb: (obj: { status?: string }) => void) => void;
  setFilterAsset: (pair: string) => void;
  setFilterPrice: (min: number, max: number) => void;
  setFilterAmount: (min: number) => void;
  clearFilters: () => void;
  getOffers: (skip: number, limit: number) => unknown;
  getConnectionStatus: () => string;
  getStats: () => { received?: number; filtered?: number; bufferLen?: number };
}

export interface UseSplashWasmResult {
  status: SplashConnectionStatus;
  isReady: boolean;
  error: string | null;
  initAndConnect: (relayUrl: string, network: "mainnet" | "testnet") => Promise<void>;
  disconnect: () => void;
  setFilterAsset: (pair: string) => void;
  setFilterPrice: (min: number, max: number) => void;
  setFilterAmount: (min: number) => void;
  clearFilters: () => void;
  getOffers: (skip: number, limit: number) => DexieOffer[];
  getStats: () => { received: number; filtered: number; bufferLen: number };
  onOffers: (callback: (offers: DexieOffer[]) => void) => void;
}

export function useSplashWasm(): UseSplashWasmResult {
  const [status, setStatus] = useState<SplashConnectionStatus>("disconnected");
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const moduleRef = useRef<SplashWasmModule | null>(null);
  const offersCallbackRef = useRef<((offers: DexieOffer[]) => void) | null>(null);
  const bufferRef = useRef<DexieOffer[]>([]);
  const receivedCountRef = useRef(0);
  const networkRef = useRef<"mainnet" | "testnet">("mainnet");

  const onOffers = useCallback((callback: (offers: DexieOffer[]) => void) => {
    offersCallbackRef.current = callback;
  }, []);

  const initAndConnect = useCallback(
    async (relayUrl: string, network: "mainnet" | "testnet") => {
      setError(null);
      if (!isValidRelayUrl(relayUrl)) {
        setError("No Splash relay URL configured");
        setStatus("disconnected");
        return;
      }
      networkRef.current = network;
      setStatus("connecting");
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.log("[Splash] initAndConnect", relayUrl, network);
      }
      const networkName = network === "testnet" ? "splash-testnet" : "splash";
      // Use 127.0.0.1 instead of localhost so WASM/browser can connect without DNS
      const urlForWasm = relayUrl.replace(
        /^(wss?:\/\/)localhost(\b)/i,
        (_, scheme, rest) => `${scheme}127.0.0.1${rest}`,
      );
      try {
        const wasmPath = "/wasm/splash_wasm.js";
        // Load the WASM JS glue module (named exports = proper JS wrappers)
        const wasmModule = await import(/* webpackIgnore: true */ wasmPath);
        // Initialize the WASM binary. default() returns raw InitOutput (low-level
        // pointers) — do NOT use it as the API; use the named exports instead.
        await (wasmModule.default as (opts?: { module_or_path?: string }) => Promise<unknown>)({
          module_or_path: "/wasm/splash_wasm_bg.wasm",
        });
        // Named exports (init, connect, setOnOffersCallback, …) are the JS wrappers
        // that properly marshal strings/objects to WASM memory.
        const mod = wasmModule as unknown as SplashWasmModule;
        moduleRef.current = mod;
        bufferRef.current = [];
        receivedCountRef.current = 0;

        // init() first so WRAPPER has relay_url/network; then set callbacks (init overwrites them)
        mod.init(urlForWasm, networkName);

        mod.setOnStatusCallback((obj: { status?: string; message?: string }) => {
          const s = (obj?.status as string) || "disconnected";
          setStatus(s as SplashConnectionStatus);
          setError(s === "error" && obj?.message ? String(obj.message) : null);
          if (process.env.NODE_ENV === "development") {
            // eslint-disable-next-line no-console
            console.log("[Splash] status:", s, obj?.message ? `(${obj.message})` : "");
          }
        });

        mod.setOnOffersCallback((raw: unknown) => {
          // WASM calls with a single offer object; normalize to array
          const arr = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
          for (const item of arr) {
            const p = item as SplashOfferPayload;
            if (p?.offer && typeof p.offer === "string") {
              // Fire-and-forget: enrich via Dexie API then push to buffer
              void (async () => {
                let enriched: DexieOffer;
                try {
                  const apiUrl = getDexieApiUrl(networkRef.current);
                  const resp = await fetch(`${apiUrl}/v1/offers`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ offer: p.offer }),
                  });
                  const data = (await resp.json()) as {
                    success?: boolean;
                    offer?: DexieOffer;
                  };
                  if (data.success && data.offer) {
                    enriched = { ...data.offer, offer: p.offer };
                  } else {
                    enriched = toMinimalDexieOffer(p);
                  }
                } catch {
                  enriched = toMinimalDexieOffer(p);
                }
                receivedCountRef.current += 1;
                const buf = bufferRef.current;
                if (buf.length >= MAX_BUFFER_LEN) buf.shift();
                buf.push(enriched);
                offersCallbackRef.current?.([enriched]);
                if (process.env.NODE_ENV === "development") {
                  // eslint-disable-next-line no-console
                  console.log(
                    "[Splash] offer",
                    enriched.id || "(raw)",
                    "offered:", enriched.offered?.length ?? 0,
                    "requested:", enriched.requested?.length ?? 0,
                  );
                }
              })();
            } else if (process.env.NODE_ENV === "development") {
              // eslint-disable-next-line no-console
              console.warn("[Splash] skipped item: missing or invalid offer string", p);
            }
          }
        });

        mod.connect();
        setIsReady(true);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setStatus("error");
        setIsReady(false);
      }
    },
    [],
  );

  const disconnect = useCallback(() => {
    try {
      moduleRef.current?.disconnect();
    } catch {
      // ignore
    }
    moduleRef.current = null;
    setIsReady(false);
    setStatus("disconnected");
  }, []);

  const setFilterAsset = useCallback((pair: string) => {
    try {
      moduleRef.current?.setFilterAsset(pair);
    } catch {
      // ignore
    }
  }, []);

  const setFilterPrice = useCallback((min: number, max: number) => {
    try {
      moduleRef.current?.setFilterPrice(min, max);
    } catch {
      // ignore
    }
  }, []);

  const setFilterAmount = useCallback((min: number) => {
    try {
      moduleRef.current?.setFilterAmount(min);
    } catch {
      // ignore
    }
  }, []);

  const clearFilters = useCallback(() => {
    try {
      moduleRef.current?.clearFilters();
    } catch {
      // ignore
    }
  }, []);

  const getOffers = useCallback((skip: number, limit: number): DexieOffer[] => {
    const buf = bufferRef.current;
    const start = Math.min(skip, buf.length);
    const end = Math.min(start + limit, buf.length);
    return buf.slice(start, end);
  }, []);

  const getStats = useCallback(() => {
    const buf = bufferRef.current;
    return {
      received: receivedCountRef.current,
      filtered: buf.length,
      bufferLen: buf.length,
    };
  }, []);

  return {
    status,
    isReady,
    error,
    initAndConnect,
    disconnect,
    setFilterAsset,
    setFilterPrice,
    setFilterAmount,
    clearFilters,
    getOffers,
    getStats,
    onOffers,
  };
}
