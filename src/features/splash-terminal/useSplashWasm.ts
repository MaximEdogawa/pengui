"use client";

import { type RefObject, useCallback, useRef, useState } from "react";
import type { DexieAsset, DexieOffer } from "@/entities/offer";
import { applyWebSocketBufferedAmountPatch } from "@/shared/lib/websocketBufferedAmountPatch";
import { WASM_FILES, WASM_PATH_PREFIX } from "@/shared/lib/constants/apiProxy";

export type SplashConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

const MAX_BUFFER_LEN = 10_000;

function isValidRelayUrl(url: unknown): url is string {
  return typeof url === "string" && (url.startsWith("ws://") || url.startsWith("wss://"));
}

type EnrichedOfferFromRelay = unknown;

function getField(obj: unknown, key: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  return (obj as Record<string, unknown>)[key];
}

function normalizeAssetFromStream(raw: unknown): DexieAsset {
  const id = getField(raw, "id");
  const code = getField(raw, "code");
  const name = getField(raw, "name");
  const amount = getField(raw, "amount");

  return {
    id: typeof id === "string" ? id : "",
    code: typeof code === "string" ? code : "",
    name: typeof name === "string" ? name : "",
    amount: typeof amount === "number" ? amount : Number(amount ?? 0) || 0,
  };
}

function normalizeOfferFromStream(raw: unknown): DexieOffer | null {
  if (!raw || typeof raw !== "object") return null;
  const offer = getField(raw, "offer");
  const offerStr = typeof offer === "string" ? offer : "";
  const offeredField = getField(raw, "offered");
  const requestedField = getField(raw, "requested");

  const offeredRaw = Array.isArray(offeredField) ? offeredField : [];
  const requestedRaw = Array.isArray(requestedField) ? requestedField : [];

  const offered = offeredRaw.map(normalizeAssetFromStream);
  const requested = requestedRaw.map(normalizeAssetFromStream);

  // If we have neither an offer string nor any asset details, treat as invalid.
  if (!offerStr && offered.length === 0 && requested.length === 0) {
    return null;
  }

  const maker = getField(raw, "maker");
  const id = getField(raw, "id");
  const status = getField(raw, "status");
  const dateFound = getField(raw, "date_found");
  const dateCompleted = getField(raw, "date_completed");
  const datePending = getField(raw, "date_pending");
  const dateExpiry = getField(raw, "date_expiry");
  const blockExpiry = getField(raw, "block_expiry");
  const spentBlockIndex = getField(raw, "spent_block_index");
  const price = getField(raw, "price");
  const fees = getField(raw, "fees");
  const knownTaker = getField(raw, "known_taker");

  return {
    // DexieOffer fields
    maker: typeof maker === "string" ? maker : "",
    id: typeof id === "string" ? id : offerStr,
    status: typeof status === "number" ? status : 0,
    offer: offerStr,
    date_found: typeof dateFound === "string" ? dateFound : new Date().toISOString(),
    date_completed:
      typeof dateCompleted === "string" || dateCompleted === null ? dateCompleted : null,
    date_pending: typeof datePending === "string" || datePending === null ? datePending : null,
    date_expiry: typeof dateExpiry === "string" || dateExpiry === null ? dateExpiry : null,
    block_expiry: typeof blockExpiry === "number" ? blockExpiry : null,
    spent_block_index: typeof spentBlockIndex === "number" ? spentBlockIndex : null,
    price: typeof price === "number" ? price : Number(price ?? 0) || 0,
    offered,
    requested,
    fees: typeof fees === "number" ? fees : Number(fees ?? 0) || 0,
    known_taker: knownTaker ?? null,
  };
}

async function waitAfterDisconnectIfNeeded(
  signal: AbortSignal | undefined,
  lastDisconnectTimeRef: RefObject<number | null>
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
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        resolve();
      },
      { once: true }
    );
  });
  lastDisconnectTimeRef.current = null;
}

async function disconnectExistingAndWait(
  moduleRef: RefObject<SplashWasmModule | null>,
  lastDisconnectTimeRef: RefObject<number | null>,
  setIsReady: (v: boolean) => void,
  setStatus: (s: SplashConnectionStatus) => void
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
  signal: AbortSignal | undefined
): Promise<SplashWasmModule> {
  const wasmModule = await import(/* webpackIgnore: true */ wasmJsPath);
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  await (wasmModule.default as (opts?: { module_or_path?: string }) => Promise<unknown>)({
    module_or_path: wasmBinaryPath,
  });
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  return wasmModule as unknown as SplashWasmModule;
}

function createOffersCallback(
  _networkRef: RefObject<"mainnet" | "testnet">,
  bufferRef: RefObject<DexieOffer[]>,
  receivedCountRef: RefObject<number>,
  offersCallbacksRef: RefObject<Set<(offers: DexieOffer[]) => void>>
): (raw: unknown) => void {
  return (raw: unknown) => {
    const arr = Array.isArray(raw) ? raw : raw != null ? [raw] : [];

    const offers = arr
      .map((item: EnrichedOfferFromRelay) => normalizeOfferFromStream(item))
      .filter((o): o is DexieOffer => o != null);

    offers.forEach((enriched) => {
      // Deduplicate by id or offer string so the buffer and listeners
      // don't receive the same offer repeatedly.
      const key = enriched.id || enriched.offer;
      if (key) {
        const buf = bufferRef.current;
        const alreadyPresent = buf.some((o) => (o.id || o.offer) === key);
        if (alreadyPresent) {
          return;
        }
      }

      receivedCountRef.current += 1;
      const buf = bufferRef.current;
      if (buf.length >= MAX_BUFFER_LEN) buf.shift();
      buf.push(enriched);
      offersCallbacksRef.current.forEach((cb) => cb([enriched]));
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
    signal?: AbortSignal
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
  // Inside the Sage snapshot the page is served from the `sage-app://` custom protocol,
  // whose origin serialises to "null"; a root-relative path resolves correctly there.
  const origin = typeof window !== "undefined" ? window.location?.origin : undefined;
  return origin && /^https?:\/\//.test(origin) ? origin : "";
}

/**
 * WASM path. The hosted deployment goes through the API route so Content-Type is correct
 * behind the reverse proxy; the Sage snapshot has no routes and reads the static
 * `/wasm/` files (WASM_PATH_PREFIX, see src/shared/lib/constants/apiProxy.ts).
 */
function getWasmPaths(): { js: string; wasm: string } {
  const base = getWasmBaseUrl();
  return {
    js: `${base}${WASM_PATH_PREFIX}/${WASM_FILES[0]}`,
    wasm: `${base}${WASM_PATH_PREFIX}/${WASM_FILES[1]}`,
  };
}

export async function broadcastOfferToSplash(offer: string): Promise<void> {
  try {
    const { js: wasmPath } = getWasmPaths();
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
    return () => {
      offersCallbacksRef.current.delete(callback);
    };
  }, []);

  const initAndConnect = useCallback(
    async (relayUrl: string, network: "mainnet" | "testnet", signal?: AbortSignal) => {
      setError(null);
      if (!isValidRelayUrl(relayUrl)) {
        setError("No Splash relay URL configured");
        setStatus("disconnected");
        return;
      }
      networkRef.current = network;
      setStatus("connecting");
      const networkName = network === "testnet" ? "splash-testnet" : "splash";
      const urlForWasm = relayUrl.replace(
        /^(wss?:\/\/)localhost(\b)/i,
        (_, scheme, rest) => `${scheme}127.0.0.1${rest}`
      );
      const { js: wasmJsPath, wasm: wasmBinaryPath } = getWasmPaths();
      try {
        await waitAfterDisconnectIfNeeded(signal, lastDisconnectTimeRef);
        if (signal?.aborted) return;

        await disconnectExistingAndWait(moduleRef, lastDisconnectTimeRef, setIsReady, setStatus);
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
          createOffersCallback(networkRef, bufferRef, receivedCountRef, offersCallbacksRef)
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
    []
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
