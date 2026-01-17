# Smoke Tests

Smoke tests are quick checks that verify critical paths work. These tests should:

- Run fast (< 5 minutes total)
- Test only the most essential user flows
- Be stable and reliable
- Run on every commit/PR

## Current Smoke Tests

1. **Login Page Load** - Verifies the login page loads correctly
2. **Navigation** - Verifies basic page navigation works
3. **Network Picker** - Verifies network selection UI is present

## Adding New Smoke Tests

When adding new smoke tests, ensure they:
- Test critical user paths only
- Complete in < 30 seconds each
- Don't require complex setup or mocking
- Are independent and can run in any order

## Running Smoke Tests

```bash
# Run all smoke tests
bun run test:e2e tests/e2e/smoke

# Run specific smoke test
bun run test:e2e tests/e2e/smoke/critical-paths.spec.ts
```
