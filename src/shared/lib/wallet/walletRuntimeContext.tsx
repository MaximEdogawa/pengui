"use client";

import { createContext, useContext } from "react";
import { detectWalletRuntime } from "./detectWalletRuntime";
import type { WalletCapabilities, WalletProvider, WalletRuntimeKind, WalletState } from "./types";

export interface WalletRuntimeContextValue {
  kind: WalletRuntimeKind;
  /** The active adapter. Stable for the lifetime of the runtime. */
  provider: WalletProvider;
  /** Current connection state, already reconciled with React. */
  state: WalletState;
}

export const WalletRuntimeContext = createContext<WalletRuntimeContextValue | null>(null);

/**
 * Runtime kind only. Available above {@link WalletRuntimeContext} so provider
 * bootstrapping (AppProviders, NetworkProvider) can branch on the transport
 * before an adapter exists.
 */
export const WalletRuntimeKindContext = createContext<WalletRuntimeKind | null>(null);

/**
 * Which wallet transport is active.
 *
 * Falls back to {@link detectWalletRuntime} when no override provider is
 * mounted, so components work in isolation (tests, Playwright CT).
 */
export function useWalletRuntimeKind(): WalletRuntimeKind {
  const override = useContext(WalletRuntimeKindContext);
  const runtime = useContext(WalletRuntimeContext);
  if (override) return override;
  if (runtime) return runtime.kind;
  return detectWalletRuntime();
}

export function useWalletRuntime(): WalletRuntimeContextValue {
  const context = useContext(WalletRuntimeContext);
  if (context === null) {
    throw new Error("useWalletRuntime must be used within a WalletRuntimeProvider");
  }
  return context;
}

/** The active wallet adapter. */
export function useWalletProvider(): WalletProvider {
  return useWalletRuntime().provider;
}

/** Connection state of the active wallet adapter. */
export function useWalletState(): WalletState {
  return useWalletRuntime().state;
}

/** What the active wallet adapter can do; use it to disable UI. */
export function useWalletCapabilities(): WalletCapabilities {
  return useWalletRuntime().state.capabilities;
}
