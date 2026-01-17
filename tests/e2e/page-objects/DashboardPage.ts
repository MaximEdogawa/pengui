import { Page, Locator } from '@playwright/test'

/**
 * Page Object Model for Dashboard Page
 * Encapsulates page-specific selectors and actions
 */
export class DashboardPage {
  readonly page: Page
  readonly balanceCard: Locator
  readonly statsGrid: Locator
  readonly transactionList: Locator

  constructor(page: Page) {
    this.page = page
    this.balanceCard = page.locator('[data-testid="balance-card"]').or(
      page.getByText(/balance/i)
    )
    this.statsGrid = page.locator('[data-testid="stats-grid"]')
    this.transactionList = page.locator('[data-testid="transaction-list"]')
  }

  async goto() {
    await this.page.goto('/dashboard')
  }

  async isVisible() {
    // Verify dashboard elements are visible
    // Adjust based on actual implementation
  }
}
