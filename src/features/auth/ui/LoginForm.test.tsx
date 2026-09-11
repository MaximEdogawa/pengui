import { afterEach, describe, expect, it } from "bun:test";
import { renderWithProviders, screen, waitFor } from "@/test-utils/render-with-providers";
import { installMockSageBridge, type MockSageBridgeHandle } from "@/test-utils/mocks/sageBridge";
import { setStoredNetwork } from "@/shared/lib/utils/networkStorage";
import LoginForm from "./LoginForm";

/**
 * The login screen in both wallet runtimes (TASK-001.05 AC #3), rendered
 * through `renderWithProviders({ walletRuntime })` with the mock Sage host
 * installed for the Sage cases. The Playwright CT twin of this file is
 * `tests/ct/login-form.ct.spec.tsx`.
 */

let sage: MockSageBridgeHandle | null = null;

afterEach(() => {
  sage?.uninstall();
  sage = null;
  // NetworkProvider persists Sage's network to localStorage; reset for the next test.
  setStoredNetwork("mainnet");
});

describe("LoginForm in WalletConnect mode", () => {
  it("renders the QR/pairing connect button, the network picker and the Sage link", async () => {
    renderWithProviders(<LoginForm />, { walletRuntime: "walletconnect" });

    expect(screen.getByRole("heading", { name: /pengui/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /connect/i })).toBeInTheDocument();
    expect(screen.getByText(/Connect with Sage Wallet/i)).toBeInTheDocument();
    expect(screen.queryByText(/Connecting to Sage/i)).toBeNull();
    // Network is switchable outside Sage: a dropdown trigger, not the read-only badge.
    expect(screen.queryByLabelText(/set by Sage/i)).toBeNull();
  });
});

describe("LoginForm in Sage mode", () => {
  it("connects without a QR code and follows Sage's network", async () => {
    sage = installMockSageBridge({ networkId: "testnet11" });
    renderWithProviders(<LoginForm />, { walletRuntime: "sage-bridge" });

    await screen.findByText(/Connected — redirecting/i);

    expect(screen.queryByText(/Connect with Sage Wallet/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /connect wallet/i })).toBeNull();
    await waitFor(() =>
      expect(screen.getByLabelText(/Network: Testnet \(set by Sage\)/i)).toBeInTheDocument()
    );
    // connect() went through the bridge: capabilities requested, identity resolved.
    expect(sage.callsTo("app.requestCapabilityGrant").length).toBeGreaterThan(0);
    expect(sage.callsTo("wallet.getSyncStatus").length).toBeGreaterThan(0);
  });

  it("shows the bridge error and a retry button when Sage has no wallet to offer", async () => {
    sage = installMockSageBridge({ key: null, receiveAddress: null, grantable: [] });
    renderWithProviders(<LoginForm />, { walletRuntime: "sage-bridge" });

    await screen.findByText(/no wallet identity/i);
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    expect(screen.queryByText(/Connected — redirecting/i)).toBeNull();
  });
});
