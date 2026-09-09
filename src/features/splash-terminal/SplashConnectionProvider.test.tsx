/**
 * Regression test for TASK-005: being inside the trading provider stack is
 * enough to start the offer stream - no tab has to be opened or activated.
 */

import { describe, expect, it, mock, beforeEach } from "bun:test";
import React from "react";
import { render, waitFor, cleanup } from "@testing-library/react";
import { AllTheProviders } from "@/test-utils";

const connectCalls: Array<{ relayUrl: string; network: string }> = [];

const wasmMock = {
  status: "disconnected" as const,
  isReady: false,
  error: null,
  initAndConnect: async (relayUrl: string, network: "mainnet" | "testnet") => {
    connectCalls.push({ relayUrl, network });
  },
  disconnect: () => {},
  broadcastOffer: () => {},
  setFilterAsset: () => {},
  setFilterPrice: () => {},
  setFilterAmount: () => {},
  clearFilters: () => {},
  getOffers: () => [],
  getStats: () => ({ received: 0, filtered: 0, bufferLen: 0 }),
  onOffers: () => () => {},
};

// bun's mock.module is global and outlives this file, so keep every other export
// intact - other suites import broadcastOfferToSplash through the feature barrel.
const actualSplashWasm = await import("./useSplashWasm");

mock.module("./useSplashWasm", () => ({
  ...actualSplashWasm,
  useSplashWasm: () => wasmMock,
}));

const { SplashConnectionProvider } = await import("./SplashConnectionProvider");

describe("SplashConnectionProvider", () => {
  beforeEach(() => {
    cleanup();
    connectCalls.length = 0;
  });

  it("connects to the relay on mount, without any stream view being rendered", async () => {
    render(
      <AllTheProviders>
        <SplashConnectionProvider>
          <div data-testid="order-book-tab">order book</div>
        </SplashConnectionProvider>
      </AllTheProviders>
    );

    await waitFor(() => expect(connectCalls.length).toBe(1));
    expect(connectCalls[0]?.relayUrl).toMatch(/^wss?:\/\//);
  });
});
