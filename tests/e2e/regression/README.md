# Regression Tests

Regression tests verify that previously fixed bugs don't reoccur. These tests:

- Reference specific bug tickets
- Test scenarios that previously caused issues
- Run on every PR and before releases
- Should be stable and reliable

## Adding Regression Tests

When a bug is fixed:

1. Create a test that reproduces the bug scenario
2. Reference the bug ticket in the test name: `BUG-123: Description`
3. Verify the fix works correctly
4. Add the test to this file

## Test Naming Convention

```typescript
test('BUG-123: App crashes when wallet disconnects', async ({ page }) => {
  // Test that verifies the bug is fixed
})
```

## Running Regression Tests

```bash
# Run all regression tests
bun run test:e2e tests/e2e/regression

# Run specific regression test
bun run test:e2e tests/e2e/regression/bug-fixes.spec.ts
```
