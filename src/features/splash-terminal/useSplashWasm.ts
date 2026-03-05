"use client";

import { useCallback, useRef, useState, type MutableRefObject } from "react";
import type { DexieOffer } from "@/entities/offer";
import { getDexieApiUrl } from "@/shared/lib/utils/networkUtils";
import { applyWebSocketBufferedAmountPatch } from "@/shared/lib/websocketBufferedAmountPatch";

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

async function waitAfterDisconnectIfNeeded(
  signal: AbortSignal | undefined,
  lastDisconnectTimeRef: MutableRefObject<number | null>,
): Promise<void> {
  const lastDisconnect = lastDisconnectTimeRef.current;
  if (lastDisconnect == null) return;
  const elapsed = Date.now() - lastDisconnect;
  const waitMs = Math.max(0, 600 - elapsed);
  if (waitMs <= 0) {
    lastDisconnectTimeRef.current = null;
    return;
  }
  await new Promise<void>((resolve) => {
    const t = setTimeout(resolve, waitMs);
    signal?.addEventListener("abort", () => { clearTimeout(t); resolve(); }, { once: true });
  });
  lastDisconnectTimeRef.current = null;
}

async function disconnectExistingAndWait(
  moduleRef: MutableRefObject<SplashWasmModule | null>,
  lastDisconnectTimeRef: MutableRefObject<number | null>,
  setIsReady: (v: boolean) => void,
  setStatus: (s: SplashConnectionStatus) => void,
): Promise<void> {
  if (!moduleRef.current) return;
  try {
    moduleRef.current.disconnect();
  } catch {
    // ignore
  }
  moduleRef.current = null;
  setIsReady(false);
  setStatus("disconnected");
  lastDisconnectTimeRef.current = Date.now();
  await new Promise((r) => setTimeout(r, 400));
}

async function loadWasmModule(
  wasmJsPath: string,
  wasmBinaryPath: string,
  signal: AbortSignal | undefined,
): Promise<SplashWasmModule> {
  const wasmModule = await import(/* webpackIgnore: true */ wasmJsPath);
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  await (wasmModule.default as (opts?: { module_or_path?: string }) => Promise<unknown>)({
    module_or_path: wasmBinaryPath,
  });
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  return wasmModule as unknown as SplashWasmModule;
}

async function enrichOfferPayload(
  p: SplashOfferPayload,
  network: "mainnet" | "testnet",
): Promise<DexieOffer> {
  try {
    const apiUrl = getDexieApiUrl(network);
    const resp = await fetch(`${apiUrl}/v1/offers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offer: p.offer }),
    });
    const data = (await resp.json()) as { success?: boolean; offer?: DexieOffer };
    if (data.success && data.offer) {
      return { ...data.offer, offer: p.offer };
    }
  } catch {
    // fall through to minimal
  }
  return toMinimalDexieOffer(p);
}

function createOffersCallback(
  networkRef: MutableRefObject<"mainnet" | "testnet">,
  bufferRef: MutableRefObject<DexieOffer[]>,
  receivedCountRef: MutableRefObject<number>,
  offersCallbacksRef: MutableRefObject<Set<(offers: DexieOffer[]) => void>>,
): (raw: unknown) => void {
  return (raw: unknown) => {
    const arr = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
    arr.forEach((item: unknown) => {
      const p = item as SplashOfferPayload;
      if (!p?.offer || typeof p.offer !== "string") return;
      void (async () => {
        const enriched = await enrichOfferPayload(p, networkRef.current);
        receivedCountRef.current += 1;
        const buf = bufferRef.current;
        if (buf.length >= MAX_BUFFER_LEN) buf.shift();
        buf.push(enriched);
        offersCallbacksRef.current.forEach((cb) => cb([enriched]));
      })();
    });
  };
}

interface SplashWasmModule {
  init: (relayUrl: string, network: string) => void;
  connect: () => void;
  disconnect: () => void;
  broadcastOffer: (offer: string) => void;
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
  initAndConnect: (
    relayUrl: string,
    network: "mainnet" | "testnet",
    signal?: AbortSignal,
  ) => Promise<void>;
  disconnect: () => void;
  broadcastOffer: (offer: string) => void;
  setFilterAsset: (pair: string) => void;
  setFilterPrice: (min: number, max: number) => void;
  setFilterAmount: (min: number) => void;
  clearFilters: () => void;
  getOffers: (skip: number, limit: number) => DexieOffer[];
  getStats: () => { received: number; filtered: number; bufferLen: number };
  onOffers: (callback: (offers: DexieOffer[]) => void) => () => void;
}

/**
 * Broadcast an offer string to the Splash p2p network.
 * Works from anywhere in the app — the WASM module is a global singleton,
 * so once the streaming hook has initialised and connected it is ready.
 */
function getWasmBaseUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
}

export async function broadcastOfferToSplash(offer: string): Promise<void> {
  try {
    const wasmPath = `${getWasmBaseUrl()}/wasm/splash_wasm.js`;
    const wasmModule = await import(/* webpackIgnore: true */ wasmPath);
    const mod = wasmModule as unknown as SplashWasmModule;
    mod.broadcastOffer(offer);
  } catch {
    // ignore
  }
}

export function useSplashWasm(): UseSplashWasmResult {
  const [status, setStatus] = useState<SplashConnectionStatus>("disconnected");
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const moduleRef = useRef<SplashWasmModule | null>(null);
  const offersCallbacksRef = useRef<Set<(offers: DexieOffer[]) => void>>(new Set());
  const bufferRef = useRef<DexieOffer[]>([]);
  const receivedCountRef = useRef(0);
  const networkRef = useRef<"mainnet" | "testnet">("mainnet");
  /** When set, initAndConnect must wait this long since last disconnect so WASM swarm loop can exit (avoids memory OOB). */
  const lastDisconnectTimeRef = useRef<number | null>(null);

  const onOffers = useCallback((callback: (offers: DexieOffer[]) => void) => {
    offersCallbacksRef.current.add(callback);
    // Return cleanup function to remove this specific listener
    return () => { offersCallbacksRef.current.delete(callback); };
  }, []);

  const initAndConnect = useCallback(
    async (
      relayUrl: string,
      network: "mainnet" | "testnet",
      signal?: AbortSignal,
    ) => {
      setError(null);
      if (!isValidRelayUrl(relayUrl)) {
        setError("No Splash relay URL configured");
        setStatus("disconnected");
        return;
      }
      networkRef.current = network;
      setStatus("connecting");
      const networkName = network === "testnet" ? "splash-testnet" : "splash";
      // Use 127.0.0.1 instead of localhost so WASM/browser can connect without DNS
      const urlForWasm = relayUrl.replace(
        /^(wss?:\/\/)localhost(\b)/i,
        (_, scheme, rest) => `${scheme}127.0.0.1${rest}`,
      );
      const base = getWasmBaseUrl();
      const wasmJsPath = `${base}/wasm/splash_wasm.js`;
      const wasmBinaryPath = `${base}/wasm/splash_wasm_bg.wasm`;
      try {
        await waitAfterDisconnectIfNeeded(signal, lastDisconnectTimeRef);
        if (signal?.aborted) return;

        await disconnectExistingAndWait(
          moduleRef,
          lastDisconnectTimeRef,
          setIsReady,
          setStatus,
        );
        if (signal?.aborted) return;

        applyWebSocketBufferedAmountPatch();
        const mod = await loadWasmModule(wasmJsPath, wasmBinaryPath, signal);
        if (signal?.aborted) return;

        moduleRef.current = mod;
        bufferRef.current = [];
        receivedCountRef.current = 0;
        mod.init(urlForWasm, networkName);

        mod.setOnStatusCallback((obj: { status?: string; message?: string }) => {
          const s = (obj?.status as string) || "disconnected";
          setStatus(s as SplashConnectionStatus);
          setError(s === "error" && obj?.message ? String(obj.message) : null);
        });
        mod.setOnOffersCallback(
          createOffersCallback(
            networkRef,
            bufferRef,
            receivedCountRef,
            offersCallbacksRef,
          ),
        );

        mod.connect();
        if (signal?.aborted) {
          try {
            mod.disconnect();
          } catch {
            // ignore
          }
          moduleRef.current = null;
          return;
        }
        setIsReady(true);
      } catch (e) {
        if (signal?.aborted) return;
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
    lastDisconnectTimeRef.current = Date.now();
    setIsReady(false);
    setStatus("disconnected");
  }, []);

  const broadcastOffer = useCallback((offer: string) => {
    try {
      moduleRef.current?.broadcastOffer(offer);
    } catch {
      // ignore
    }
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
    broadcastOffer,
    setFilterAsset,
    setFilterPrice,
    setFilterAmount,
    clearFilters,
    getOffers,
    getStats,
    onOffers,
  };
}
