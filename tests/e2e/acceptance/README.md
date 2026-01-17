# Acceptance Tests

Acceptance tests validate complete user stories and feature functionality. These tests:

- Test end-to-end user workflows
- Validate acceptance criteria from user stories
- May require more complex setup (mocks, test data, etc.)
- Run on PR and before releases

## Test Organization

Acceptance tests are organized by feature area:
- `auth-features.spec.ts` - Authentication and login flows
- `wallet-features.spec.ts` - Wallet connection and management
- Add more as features are developed

## Adding Acceptance Tests

When implementing a new feature:

1. Review the user story acceptance criteria
2. Create tests that validate each acceptance criterion
3. Use descriptive test names that match user story language
4. Ensure tests are independent and can run in any order

## Running Acceptance Tests

```bash
# Run all acceptance tests
bun run test:e2e tests/e2e/acceptance

# Run specific acceptance test
bun run test:e2e tests/e2e/acceptance/auth-features.spec.ts
```
