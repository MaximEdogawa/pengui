import { describe, it, expect, afterEach } from "bun:test";
import { renderHook } from "@testing-library/react";
import { cleanup, renderWithProviders, screen } from "@/test-utils/render-with-providers";
import {
  useWalletCapabilities,
  useWalletProvider,
  useWalletRuntimeKind,
  useWalletState,
} from "./WalletRuntimeProvider";

/** Renders the wallet runtime context so assertions can read it from the DOM. */
function RuntimeProbe() {
  const kind = useWalletRuntimeKind();
  const provider = useWalletProvider();
  const state = useWalletState();
  const capabilities = useWalletCapabilities();

  return (
    <div>
      <span data-testid="kind">{kind}</span>
      <span data-testid="provider-kind">{provider.kind}</span>
      <span data-testid="connected">{String(state.isConnected)}</span>
      <span data-testid="ready">{String(state.isReady)}</span>
      <span data-testid="network">{state.network}</span>
      <span data-testid="can-create-offer">{String(capabilities.createOffer)}</span>
    </div>
  );
}

afterEach(cleanup);

describe("WalletRuntimeProvider", () => {
  it("selects the WalletConnect adapter in a normal browser", () => {
    renderWithProviders(<RuntimeProbe />);

    expect(screen.getByTestId("kind").textContent).toBe("walletconnect");
    expect(screen.getByTestId("provider-kind").textContent).toBe("walletconnect");
    expect(screen.getByTestId("can-create-offer").textContent).toBe("true");
  });

  it("starts disconnected and not ready with no wallet paired", () => {
    renderWithProviders(<RuntimeProbe />);

    expect(screen.getByTestId("connected").textContent).toBe("false");
    expect(screen.getByTestId("ready").textContent).toBe("false");
    expect(screen.getByTestId("network").textContent).toBe("mainnet");
  });

  it("honours a runtime override so tests and the Sage harness can force a transport", () => {
    renderWithProviders(<RuntimeProbe />, { walletRuntime: "sage-bridge" });

    expect(screen.getByTestId("kind").textContent).toBe("sage-bridge");
    expect(screen.getByTestId("provider-kind").textContent).toBe("sage-bridge");
    // The Sage adapter lands in TASK-001.02; until then nothing is enabled.
    expect(screen.getByTestId("can-create-offer").textContent).toBe("false");
  });
});

describe("wallet runtime hooks outside a provider", () => {
  it("throw a helpful error instead of silently reporting a disconnected wallet", () => {
    expect(() => {
      renderHook(() => useWalletState());
    }).toThrow(/WalletRuntimeProvider/);
  });
});
