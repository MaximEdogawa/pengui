# Regression Tests

Regression tests are the authenticated WalletConnect browser suite. These tests:

- Reuse one initialized mock wallet client per Playwright worker
- Perform an explicit authenticated setup for each test page
- Exercise the main wallet-connected user flows with deterministic mocks
- Run on every PR and before releases
- Should be stable and reliable
- Should use mocked or deterministic data
- Should not depend on funded wallets or live chain state

WalletConnect is real in transport terms, but the wallet peer and app-side data are deterministic.

This gives the suite a better balance between speed and isolation:

- the wallet client initialization happens once per worker
- each regression test still starts from a clean authenticated page
- sessions are torn down between tests so state does not leak across cases

## Adding Regression Tests

When adding a regression test:

1. Start from the regression fixture
2. Keep the wallet and external data deterministic
3. Add any API mocks needed by the feature under test
4. Prefer user-flow coverage over implementation-detail assertions

## Test Naming Convention

```typescript
test("wallet page renders when authenticated", async ({ page }) => {
  // Authenticated deterministic regression coverage
});
```

## Running Regression Tests

```bash
# Run all regression tests
bun run test:e2e tests/e2e/regression

# Run specific regression test
bun run test:e2e tests/e2e/regression/wallet-connected.spec.ts
```
