# Testing Strategy

This document outlines the comprehensive testing strategy for the Penguin Pool application.

## Testing Pyramid

Our testing strategy follows the testing pyramid model:

```
        /\
       /  \  E2E Tests (10%)
      /____\  Slow, High Value
     /      \  Critical User Flows
    /________\ 
   /          \ Integration Tests (20%)
  /____________\ Medium Speed
 /              \ Feature Interactions
/________________\ 
                  Unit Tests (70%)
                  Fast, Instant Feedback
                  Pure Functions, Business Logic
```

## Test Types

### Unit Tests (70%)

**Purpose:** Test individual functions, utilities, hooks, and components in isolation.

**Technology:** Bun test runner

**Location:** Colocated with source files (e.g., `Button.test.tsx` next to `Button.tsx`)

**When to write:**
- Pure functions and utilities
- React hooks
- Service classes and methods
- Validators and formatters
- Business logic calculations

**Run on:** Every save (watch mode), Pre-commit, CI/CD

**Example:**
```typescript
// src/shared/lib/formatting/chia-units.test.ts
import { describe, it, expect } from 'bun:test'
import { xchToMojos } from './chia-units'

describe('xchToMojos', () => {
  it('should convert XCH to mojos correctly', () => {
    expect(xchToMojos(1)).toBe(1_000_000_000_000)
  })
})
```

### Integration Tests (20%)

**Purpose:** Test how multiple components, services, or features work together.

**Technology:** Bun test runner with React Testing Library

**Location:** `src/tests/integration/`

**When to write:**
- Feature workflows (login flow, transaction flow)
- Component + API interactions
- State management + UI
- Multiple components working together

**Run on:** Pre-commit, CI/CD

**Example:**
```typescript
// src/tests/integration/auth/login-flow.test.tsx
describe('Login Flow Integration', () => {
  it('should render login form with all required elements', () => {
    render(<LoginForm />)
    expect(screen.getByText(/pengui/i)).toBeInTheDocument()
  })
})
```

### Component Tests (Storybook)

**Purpose:** Visual documentation and interactive component playground.

**Technology:** Storybook

**Location:** `storybook/` directory, colocated with components

**When to write:**
- All shared UI components
- Different component states and variants
- Interactive component documentation

**Run on:** Development, Build time

### E2E Tests (10%)

**Purpose:** Test complete user workflows from a user's perspective.

**Technology:** Playwright

**Location:** `tests/e2e/`

**Categories:**
- **Smoke Tests:** Quick checks that critical paths work (5-10 tests, < 5 min)
- **Regression Tests:** Tests for previously fixed bugs
- **Acceptance Tests:** Full user story validation

**Run on:** Pre-deployment, Nightly, CI/CD (main branch)

**Example:**
```typescript
// tests/e2e/smoke/critical-paths.spec.ts
test('should load the login page', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByText(/pengui/i)).toBeVisible()
})
```

## Running Tests

### Unit Tests
```bash
# Run all unit tests
bun run test:unit

# Run in watch mode
bun run test:watch

# Run with coverage
bun run test:coverage
```

### Integration Tests
```bash
# Run all integration tests
bun run test:integration
```

### E2E Tests
```bash
# Run all E2E tests
bun run test:e2e

# Run with UI mode
bun run test:e2e:ui

# Run in debug mode
bun run test:e2e:debug

# Run specific category
bun run test:e2e tests/e2e/smoke
```

### All Tests
```bash
# Run all tests
bun run test
```

## Pre-commit Hooks

Pre-commit hooks automatically run:
1. Linting (ESLint)
2. Type checking (TypeScript)
3. Unit tests
4. Integration tests
5. Build check

If any step fails, the commit is blocked.

## CI/CD Pipeline

### On Pull Request
- Lint check
- Type check
- Unit tests with coverage
- Integration tests
- Smoke E2E tests

### On Merge to Main
- All PR checks
- Full E2E test suite

### Nightly (2 AM UTC)
- Full E2E test suite
- Complete regression testing

## Code Coverage

**Target:** 80% coverage for critical paths

**Coverage Reports:**
- Generated with `bun run test:coverage`
- HTML report: `coverage/index.html`
- Terminal output: Summary in console

**Exclusions:**
- Storybook files
- Test utilities
- Mocks
- Configuration files

## Test Utilities

Test utilities are located in `src/test-utils/`:

- `render-with-providers.tsx` - Render components with all providers
- `factories/` - Test data factories
- `mocks/` - Mock implementations

**Usage:**
```typescript
import { render, screen } from '@/test-utils'
import { createUser } from '@/test-utils/factories/user-factory'

test('example', () => {
  const user = createUser({ name: 'Test User' })
  render(<Component user={user} />)
  // ...
})
```

## Best Practices

1. **Write tests first** (TDD) when possible
2. **Test behavior, not implementation**
3. **Keep tests independent** - no shared state
4. **Use descriptive test names** - explain what is being tested
5. **Keep tests fast** - unit tests should be instant
6. **Mock external dependencies** - APIs, wallet, etc.
7. **Test edge cases** - empty states, error states, boundaries
8. **Maintain test coverage** - aim for 80%+ on critical paths

## Documentation

- [Unit Tests Guide](./unit-tests.md)
- [Integration Tests Guide](./integration-tests.md)
- [E2E Tests Guide](./e2e-tests.md)
- [Writing Tests Guide](./writing-tests.md)
