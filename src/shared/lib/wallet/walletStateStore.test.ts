import { describe, it, expect } from "bun:test";
import { createWalletStateStore, DISCONNECTED_WALLET_STATE } from "./walletStateStore";
import type { WalletState } from "./types";

function stateWith(overrides: Partial<WalletState>): WalletState {
  return { ...DISCONNECTED_WALLET_STATE, ...overrides };
}

describe("createWalletStateStore", () => {
  it("starts from the state it was given", () => {
    const store = createWalletStateStore(DISCONNECTED_WALLET_STATE);
    expect(store.getState()).toBe(DISCONNECTED_WALLET_STATE);
  });

  it("notifies subscribers when a field changes", () => {
    const store = createWalletStateStore(DISCONNECTED_WALLET_STATE);
    const seen: WalletState[] = [];
    store.subscribe((next) => seen.push(next));

    store.setState(stateWith({ isConnected: true, address: "xch1abc" }));

    expect(seen).toHaveLength(1);
    expect(seen[0].address).toBe("xch1abc");
    expect(store.getState().isConnected).toBe(true);
  });

  /**
   * The snapshot has to stay identical when nothing changed, otherwise
   * useSyncExternalStore consumers re-render forever.
   * See pengui-wiki/development/infinite-loop-guardrails.md.
   */
  it("keeps the snapshot identity when an equal state is published", () => {
    const store = createWalletStateStore(DISCONNECTED_WALLET_STATE);
    let notifications = 0;
    store.subscribe(() => {
      notifications += 1;
    });

    const before = store.getState();
    store.setState(stateWith({}));

    expect(store.getState()).toBe(before);
    expect(notifications).toBe(0);
  });

  it("compares capability flags too", () => {
    const store = createWalletStateStore(DISCONNECTED_WALLET_STATE);
    let notifications = 0;
    store.subscribe(() => {
      notifications += 1;
    });

    store.setState(
      stateWith({
        capabilities: { ...DISCONNECTED_WALLET_STATE.capabilities, signCoinSpends: true },
      })
    );

    expect(notifications).toBe(1);
    expect(store.getState().capabilities.signCoinSpends).toBe(true);
  });

  it("stops notifying after unsubscribe", () => {
    const store = createWalletStateStore(DISCONNECTED_WALLET_STATE);
    let notifications = 0;
    const unsubscribe = store.subscribe(() => {
      notifications += 1;
    });

    unsubscribe();
    store.setState(stateWith({ isConnected: true }));

    expect(notifications).toBe(0);
  });
});
