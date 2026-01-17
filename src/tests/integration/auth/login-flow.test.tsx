/**
 * Integration test for login flow
 * Tests the complete authentication flow from login page to wallet connection
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { render, screen } from '@/test-utils'
import LoginForm from '@/features/auth/login/ui/LoginForm'

// Note: Mocking external libraries in Bun tests requires different approach
// For now, we test what we can without mocking WalletConnect

describe('Login Flow Integration', () => {
  beforeEach(() => {
    // Reset any mocks or state
  })

  it('should render login form with all required elements', () => {
    render(<LoginForm />)

    // Check for logo text
    expect(screen.getByText(/pengui/i)).toBeInTheDocument()

    // Check for connect wallet message (this confirms the form structure)
    expect(screen.getByText(/connect your wallet to get started/i)).toBeInTheDocument()

    // Check for ConnectButton - it should render a button element
    // The ConnectButton from wallet-connect-react may not have a test-id,
    // so we check for the presence of button elements or the wallet connection area
    const buttons = screen.queryAllByRole('button')
    // At minimum, there should be some interactive elements
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('should display connect wallet message', () => {
    render(<LoginForm />)

    expect(screen.getByText(/connect your wallet to get started/i)).toBeInTheDocument()
  })

  // Note: Full wallet connection flow testing would require:
  // - Mocking WalletConnect SDK
  // - Simulating wallet connection events
  // - Testing navigation after successful connection
  // These are better suited for E2E tests with Playwright
})
