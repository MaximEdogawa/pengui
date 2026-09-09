/**
 * Regression tests for TASK-005: the offer stream must survive tab switches.
 *
 * The stream view is unmounted when the user switches to another trading tab,
 * so the offers and the Splash subscription live in StreamOffersProvider, which
 * sits above the view switch.
 */

import { describe, expect, it, mock, beforeEach } from "bun:test";
import React from "react";
import { act, render, screen, waitFor, cleanup } from "@testing-library/react";
import type { DexieOffer } from "@/entities/offer";
import { AllTheProviders } from "@/test-utils";

// ── mocked dependencies ────────────────────────────────────────────────
type OffersListener = (offers: DexieOffer[]) => void;

const listeners = new Set<OffersListener>();
const splashMock = {
  status: "connected" as const,
  onOffers: (cb: OffersListener) => {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
};

/** Push offers to every live subscriber, like the WASM stream does. */
function emitOffers(offers: DexieOffer[]) {
  act(() => {
    listeners.forEach((cb) => cb(offers));
  });
}

let snapshotOffers: DexieOffer[] = [];
let snapshotCalls = 0;

mock.module("@/features/splash-terminal/SplashConnectionProvider", () => ({
  useSplashConnection: () => splashMock,
}));

mock.module("@/features/offers/api/useDexieDataService", () => ({
  useDexieDataService: () => ({
    searchOffers: async () => {
      snapshotCalls += 1;
      return { success: true, data: snapshotOffers, total: snapshotOffers.length };
    },
  }),
}));

const { StreamOffersProvider, useStreamOffers } = await import("./StreamOffersProvider");

// ── helpers ────────────────────────────────────────────────────────────
function makeOffer(id: string, price = 1): DexieOffer {
  return {
    maker: "maker",
    id,
    status: 0,
    offer: `offer1${id}`,
    date_found: "2026-01-01T00:00:00.000Z",
    price,
    offered: [{ id: "xch", code: "XCH", name: "Chia", amount: 1 }],
    requested: [{ id: "cat", code: "USDS", name: "Stably USD", amount: price }],
    fees: 0,
  };
}

/** Stand-in for the Stream tab: only mounted while its tab is the active view. */
function StreamView() {
  const { offers } = useStreamOffers();
  return (
    <ul data-testid="stream-view">
      {offers.map((offer) => (
        <li key={offer.id}>{`${offer.id}:${offer.price}`}</li>
      ))}
    </ul>
  );
}

function OtherView() {
  return <div data-testid="other-view">order book</div>;
}

/** Stand-in for the trading page: the provider stays mounted while views swap. */
function TradingPage({ activeView }: { activeView: "stream" | "other" }) {
  return (
    <AllTheProviders>
      <StreamOffersProvider>
        {activeView === "stream" ? <StreamView /> : <OtherView />}
      </StreamOffersProvider>
    </AllTheProviders>
  );
}

describe("StreamOffersProvider", () => {
  beforeEach(() => {
    cleanup();
    listeners.clear();
    snapshotOffers = [];
    snapshotCalls = 0;
  });

  it("loads the initial offer list from the Dexie snapshot, then applies stream updates", async () => {
    snapshotOffers = [makeOffer("snapshot-1", 10)];

    render(<TradingPage activeView="stream" />);

    await waitFor(() => expect(screen.getByText("snapshot-1:10")).toBeInTheDocument());
    expect(snapshotCalls).toBe(1);

    emitOffers([makeOffer("streamed-1", 20)]);

    expect(screen.getByText("streamed-1:20")).toBeInTheDocument();
    // The snapshot stays the baseline: the stream only keeps it live.
    expect(screen.getByText("snapshot-1:10")).toBeInTheDocument();
    expect(snapshotCalls).toBe(1);
  });

  it("keeps offers and applies stream updates while the stream tab is not mounted", async () => {
    snapshotOffers = [makeOffer("snapshot-1", 10)];

    const { rerender } = render(<TradingPage activeView="stream" />);
    await waitFor(() => expect(screen.getByText("snapshot-1:10")).toBeInTheDocument());

    emitOffers([makeOffer("before-switch", 1)]);
    expect(screen.getByText("before-switch:1")).toBeInTheDocument();

    // Switch to another tab: the stream view unmounts.
    rerender(<TradingPage activeView="other" />);
    expect(screen.getByTestId("other-view")).toBeInTheDocument();
    expect(screen.queryByTestId("stream-view")).not.toBeInTheDocument();

    // The subscription is still alive while the tab is not on screen.
    expect(listeners.size).toBe(1);
    emitOffers([makeOffer("while-hidden", 2)]);

    // Switch back: nothing was lost and the background update is there.
    rerender(<TradingPage activeView="stream" />);
    expect(screen.getByText("snapshot-1:10")).toBeInTheDocument();
    expect(screen.getByText("before-switch:1")).toBeInTheDocument();
    expect(screen.getByText("while-hidden:2")).toBeInTheDocument();
    // No re-fetch on tab switch - only a page reload reloads the snapshot.
    expect(snapshotCalls).toBe(1);
  });

  it("updates an offer in place when the stream re-broadcasts it", async () => {
    snapshotOffers = [makeOffer("offer-1", 10)];

    render(<TradingPage activeView="stream" />);
    await waitFor(() => expect(screen.getByText("offer-1:10")).toBeInTheDocument());

    emitOffers([makeOffer("offer-1", 99)]);

    expect(screen.getByText("offer-1:99")).toBeInTheDocument();
    expect(screen.queryByText("offer-1:10")).not.toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });
});
