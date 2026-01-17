# E2E Tests Guide

## Overview

End-to-end (E2E) tests verify complete user workflows from a user's perspective. They test the application in a real browser environment.

## Test Categories

### Smoke Tests

**Purpose:** Quick checks that critical paths work  
**Location:** `tests/e2e/smoke/`  
**Duration:** < 5 minutes total  
**Run on:** Every commit/PR

**Example:**
```typescript
test('should load the login page', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByText(/pengui/i)).toBeVisible()
})
```

### Regression Tests

**Purpose:** Verify previously fixed bugs don't reoccur  
**Location:** `tests/e2e/regression/`  
**Run on:** Every PR

**Naming Convention:**
```typescript
test('BUG-123: App crashes when wallet disconnects', async ({ page }) => {
  // Test that verifies the bug is fixed
})
```

### Acceptance Tests

**Purpose:** Validate complete user stories  
**Location:** `tests/e2e/acceptance/`  
**Run on:** PR and before releases

**Example:**
```typescript
test('user can view login page', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByText(/pengui/i)).toBeVisible()
})
```

## Page Object Model

We use the Page Object Model pattern to encapsulate page-specific logic:

```typescript
// tests/e2e/page-objects/LoginPage.ts
import { Page, Locator, expect } from '@playwright/test'

export class LoginPage {
  readonly page: Page
  readonly logo: Locator
  readonly connectButton: Locator

  constructor(page: Page) {
    this.page = page
    this.logo = page.getByText(/pengui/i)
    this.connectButton = page.getByRole('button', { name: /connect/i })
  }

  async goto() {
    await this.page.goto('/login')
  }

  async isVisible() {
    await expect(this.logo).toBeVisible()
  }
}
```

**Usage:**
```typescript
test('login flow', async ({ page }) => {
  const loginPage = new LoginPage(page)
  await loginPage.goto()
  await loginPage.isVisible()
})
```

## Test Data Fixtures

Use fixtures for consistent test data:

```typescript
// tests/e2e/fixtures/test-data.ts
export const testUsers = {
  mainnet: {
    address: 'xch1test...',
    fingerprint: 1234567890,
  },
}
```

**Usage:**
```typescript
import { testUsers } from '../fixtures/test-data'

test('example', async ({ page }) => {
  const user = testUsers.mainnet
  // Use user data in test
})
```

## Best Practices

1. **Use Page Objects** - encapsulate page logic
2. **Use descriptive test names** - explain what is being tested
3. **Keep tests independent** - no shared state between tests
4. **Use data-testid** - for reliable element selection
5. **Wait for elements** - use `expect().toBeVisible()` instead of `waitFor()`
6. **Clean up after tests** - if needed
7. **Keep tests fast** - smoke tests < 30 seconds each

## Writing E2E Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test'

test('should load login page', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByText(/pengui/i)).toBeVisible()
})
```

### Using Page Objects

```typescript
import { test } from '@playwright/test'
import { LoginPage } from '../page-objects/LoginPage'

test('login flow', async ({ page }) => {
  const loginPage = new LoginPage(page)
  await loginPage.goto()
  await loginPage.isVisible()
})
```

### Handling Async Operations

```typescript
test('waits for element', async ({ page }) => {
  await page.goto('/dashboard')
  // Wait for element to be visible
  await expect(page.getByTestId('balance-card')).toBeVisible()
})
```

## Running E2E Tests

```bash
# Run all E2E tests
bun run test:e2e

# Run with UI mode (interactive)
bun run test:e2e:ui

# Run in debug mode
bun run test:e2e:debug

# Run specific category
bun run test:e2e tests/e2e/smoke

# Run specific test file
bun run test:e2e tests/e2e/smoke/critical-paths.spec.ts
```

## CI/CD Integration

E2E tests run:
- **On PR:** Smoke tests only
- **On merge to main:** All tests including acceptance
- **Nightly:** Full test suite

## Troubleshooting

### Tests timing out
- Increase timeout in `playwright.config.ts`
- Check if dev server is responding
- Verify network connectivity

### Tests failing locally
- Ensure dev server is running: `bun run dev`
- Check Playwright is installed: `bun install`
- Clear Playwright cache: `bunx playwright install --force`

### Element not found
- Use `data-testid` for reliable selection
- Wait for elements with `expect().toBeVisible()`
- Check if element is in iframe (may need special handling)

## Example: Complete E2E Test

```typescript
import { test, expect } from '@playwright/test'
import { LoginPage } from '../page-objects/LoginPage'

test.describe('Login Flow', () => {
  test('user can view login page', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.isVisible()
  })

  test('user can see network picker', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await expect(loginPage.networkPicker).toBeVisible()
  })
})
```
