# Integration Tests Guide

## Overview

Integration tests verify that multiple components, services, or features work together correctly. They test interactions between different parts of the application.

## When to Write Integration Tests

Write integration tests for:
- ✅ Complete user flows (login, transaction creation)
- ✅ Component interactions
- ✅ State management + UI integration
- ✅ API integration (with mocks)
- ✅ Feature workflows

Don't write integration tests for:
- ❌ Individual component rendering (use unit tests)
- ❌ Full browser-based workflows (use E2E tests)
- ❌ External service integration (use E2E tests)

## Test Structure

### Basic Integration Test

```typescript
import { describe, it, expect } from 'bun:test'
import { render, screen } from '@/test-utils'
import LoginForm from '@/features/auth/login/ui/LoginForm'

describe('Login Flow Integration', () => {
  it('should render login form with all required elements', () => {
    render(<LoginForm />)
    
    expect(screen.getByText(/pengui/i)).toBeInTheDocument()
    expect(screen.getByText(/connect your wallet/i)).toBeInTheDocument()
  })
})
```

### Testing Feature Workflows

```typescript
describe('Transaction Flow Integration', () => {
  it('should create transaction with valid data', () => {
    const transaction = createTransaction({
      type: 'income',
      amount: 100,
      assetType: 'xch',
    })

    expect(transaction.type).toBe('income')
    expect(transaction.amount).toBe(100)
  })
})
```

## Mocking External Dependencies

### Mocking Wallet Connection

```typescript
import { createMockWalletConnection } from '@/test-utils/mocks/wallet'

test('wallet connection flow', () => {
  const mockConnection = createMockWalletConnection({
    isConnected: true,
    address: 'xch1test...',
  })
  
  // Test with mocked wallet connection
})
```

### Mocking API Calls

```typescript
import { createMockApiResponse } from '@/test-utils/mocks/api'

test('API integration', () => {
  const mockResponse = createMockApiResponse({ data: 'test' })
  // Use mock response in test
})
```

## Best Practices

1. **Test complete flows** - not just individual pieces
2. **Mock external dependencies** - wallet, APIs, etc.
3. **Test component interactions** - how components work together
4. **Test state management** - Redux, React Query integration
5. **Keep tests focused** - one flow per test
6. **Use test data factories** - for consistent test data

## Example: Login Flow Integration Test

```typescript
// src/tests/integration/auth/login-flow.test.tsx
import { describe, it, expect } from 'bun:test'
import { render, screen } from '@/test-utils'
import LoginForm from '@/features/auth/login/ui/LoginForm'

describe('Login Flow Integration', () => {
  it('should render login form with all required elements', () => {
    render(<LoginForm />)

    // Verify all key elements are present
    expect(screen.getByText(/pengui/i)).toBeInTheDocument()
    expect(screen.getByText(/connect your wallet/i)).toBeInTheDocument()
  })

  // Note: Full wallet connection testing requires E2E tests
  // Integration tests focus on component integration, not full workflows
})
```

## Running Integration Tests

```bash
# Run all integration tests
bun run test:integration

# Run specific integration test
bun run test tests/integration/auth/login-flow.test.tsx
```

## Integration vs Unit vs E2E

| Aspect | Unit | Integration | E2E |
|--------|------|-------------|-----|
| Scope | Single function/component | Multiple components | Full application |
| Speed | Very fast (ms) | Fast (seconds) | Slow (minutes) |
| Dependencies | Mocked | Partially mocked | Real |
| When to use | Pure functions, utilities | Feature flows | User workflows |
