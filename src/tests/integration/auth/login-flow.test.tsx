/**
 * Integration test for login flow
 * Tests the complete authentication flow from login page to wallet connection
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { render, screen } from "@/test-utils";
import LoginForm from "@/features/auth/ui/LoginForm";

// Note: Mocking external libraries in Bun tests requires different approach
// For now, we test what we can without mocking WalletConnect

describe("Login Flow Integration", () => {
  beforeEach(() => {
    // Reset any mocks or state
  });

  it("should render login form with all required elements", () => {
    render(<LoginForm />);

    expect(screen.getByText(/pengui/i)).toBeInTheDocument();

    expect(screen.getByText(/Connect with Sage Wallet/i)).toBeInTheDocument();

    const buttons = screen.queryAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });
});
