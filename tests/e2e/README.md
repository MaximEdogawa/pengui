# E2E Tests

End-to-end tests using Playwright to test the application from a user's perspective.

## Test Structure

```
tests/e2e/
├── smoke/              # Quick critical path tests (< 5 min)
├── regression/         # Tests for previously fixed bugs
├── acceptance/         # Full user story validation
├── fixtures/           # Test data and fixtures
├── page-objects/       # Page Object Model classes
└── README.md          # This file
```

## Test Categories

### Smoke Tests
- Quick checks that critical paths work
- Run on every commit/PR
- Should complete in < 5 minutes
- Located in `smoke/`

### Regression Tests
- Tests for previously fixed bugs
- Reference bug tickets in test names
- Run on every PR
- Located in `regression/`

### Acceptance Tests
- Full user story validation
- Test complete workflows
- May require more setup
- Run on PR and before releases
- Located in `acceptance/`

## Running Tests

```bash
# Run all E2E tests
bun run test:e2e

# Run specific test category
bun run test:e2e tests/e2e/smoke
bun run test:e2e tests/e2e/regression
bun run test:e2e tests/e2e/acceptance

# Run with UI mode
bun run test:e2e:ui

# Run in debug mode
bun run test:e2e:debug
```

## Page Object Model

We use the Page Object Model pattern to encapsulate page-specific logic:

- `LoginPage` - Login page interactions
- `DashboardPage` - Dashboard page interactions
- Add more as needed

## Test Data

Test data fixtures are located in `fixtures/test-data.ts`:
- User data
- Asset data
- Network configurations

## Writing Tests

1. Use descriptive test names that explain what is being tested
2. Use Page Objects for page interactions
3. Use fixtures for test data
4. Keep tests independent and isolated
5. Clean up after tests if needed

## CI/CD Integration

E2E tests run:
- On PR: Smoke and regression tests
- On merge to main: All tests including acceptance
- Nightly: Full test suite

## Troubleshooting

### Tests failing locally
- Ensure dev server is running: `bun run dev`
- Check Playwright is installed: `bun install`
- Clear Playwright cache: `bunx playwright install --force`

### Tests timing out
- Increase timeout in `playwright.config.ts`
- Check if dev server is responding
- Verify network connectivity
