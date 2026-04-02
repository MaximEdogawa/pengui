import { type Page, type Locator, expect } from "@playwright/test";

/**
 * Page Object Model for the Login page (/login and /).
 *
 * Selectors are derived from the actual rendered HTML:
 *  - Heading:  <h1> containing "Pengui"
 *  - Connect button:  <button> "Connect Wallet"  (LoginConnectWallet)
 *  - Sage link:  <a> "Connect with Sage Wallet"  (footer anchor)
 *  - Network picker:  <button aria-label="Select network">  (NetworkPicker)
 */
export class LoginPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly connectButton: Locator;
  readonly connectWithSageLink: Locator;
  readonly networkPicker: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: /pengui/i });
    this.connectButton = page.getByRole("button", { name: /connect wallet/i });
    this.connectWithSageLink = page.getByRole("link", { name: /connect with sage wallet/i });
    this.networkPicker = page.getByRole("button", { name: "Select network" });
  }

  async goto() {
    await this.page.goto("/login");
    await this.page.waitForLoadState("domcontentloaded");
  }

  async expectVisible() {
    await expect(this.heading).toBeVisible();
    await expect(this.connectButton).toBeVisible();
    await expect(this.connectWithSageLink).toBeVisible();
  }

  /** Wait until the Connect Wallet button is no longer disabled (WC initialised). */
  async waitForReady(timeout = 10_000) {
    await expect(this.connectButton).not.toBeDisabled({ timeout });
  }
}
