import { Page, Locator, expect } from '@playwright/test'

/**
 * Page Object Model for Login Page
 * Encapsulates page-specific selectors and actions
 */
export class LoginPage {
  readonly page: Page
  readonly logo: Locator
  readonly connectButton: Locator
  readonly networkPicker: Locator
  readonly connectMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.logo = page.getByText(/pengui/i)
    this.connectButton = page.getByRole('button', { name: /connect/i })
    this.networkPicker = page.locator('[data-testid="network-picker"]').or(
      page.getByRole('button', { name: /network/i })
    )
    this.connectMessage = page.getByText(/connect your wallet/i)
  }

  async goto() {
    await this.page.goto('/login')
  }

  async isVisible() {
    await expect(this.logo).toBeVisible()
    await expect(this.connectMessage).toBeVisible()
  }

  async selectNetwork(network: 'mainnet' | 'testnet') {
    // Implementation depends on actual NetworkPicker component
    // This is a placeholder structure
    await this.networkPicker.click()
    // Select network option
  }
}
