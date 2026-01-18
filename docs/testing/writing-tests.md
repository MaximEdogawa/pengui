# Writing Tests Guide

## General Principles

### 1. Test Behavior, Not Implementation

✅ **Good:**
```typescript
test('should format XCH amount with 6 decimals', () => {
  expect(formatXchAmount(1)).toBe('1.000000')
})
```

❌ **Bad:**
```typescript
test('should call toFixed with 6', () => {
  // Testing implementation details
})
```

### 2. Use Descriptive Test Names

✅ **Good:**
```typescript
test('should convert 1 XCH to 1 trillion mojos', () => {
  expect(xchToMojos(1)).toBe(1_000_000_000_000)
})
```

❌ **Bad:**
```typescript
test('test xchToMojos', () => {
  // Not descriptive
})
```

### 3. Arrange-Act-Assert Pattern

```typescript
test('example', () => {
  // Arrange - set up test data
  const input = 1
  const expected = 1_000_000_000_000

  // Act - perform the action
  const result = xchToMojos(input)

  // Assert - verify the result
  expect(result).toBe(expected)
})
```

### 4. One Thing Per Test

✅ **Good:**
```typescript
test('should convert 1 XCH to mojos', () => {
  expect(xchToMojos(1)).toBe(1_000_000_000_000)
})

test('should convert 0.5 XCH to mojos', () => {
  expect(xchToMojos(0.5)).toBe(500_000_000_000)
})
```

❌ **Bad:**
```typescript
test('should convert XCH to mojos', () => {
  expect(xchToMojos(1)).toBe(1_000_000_000_000)
  expect(xchToMojos(0.5)).toBe(500_000_000_000)
  expect(xchToMojos(0)).toBe(0)
  // Too many assertions in one test
})
```

## Unit Test Patterns

### Testing Pure Functions

```typescript
import { describe, it, expect } from 'bun:test'
import { formatXchAmount } from './chia-units'

describe('formatXchAmount', () => {
  it('should format with default precision', () => {
    expect(formatXchAmount(1)).toBe('1.000000')
  })

  it('should format with custom precision', () => {
    expect(formatXchAmount(1, 2)).toBe('1.00')
  })

  it('should handle zero', () => {
    expect(formatXchAmount(0)).toBe('0.000000')
  })

  it('should handle invalid input', () => {
    expect(formatXchAmount(NaN)).toBe('0.000000')
  })
})
```

### Testing React Components

```typescript
import { describe, it, expect } from 'bun:test'
import { render, screen } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import Button from './Button'

describe('Button', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('should call onClick when clicked', async () => {
    let clicked = false
    const onClick = () => { clicked = true }

    render(<Button onClick={onClick}>Click me</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(clicked).toBe(true)
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

### Testing React Hooks

```typescript
import { describe, it, expect } from 'bun:test'
import { renderHook } from '@testing-library/react'
import { useResponsive } from './useResponsive'

describe('useResponsive', () => {
  it('should detect mobile view', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 800,
    })

    const { result } = renderHook(() => useResponsive())
    expect(result.current.isMobile).toBe(true)
    expect(result.current.isDesktop).toBe(false)
  })
})
```

## Integration Test Patterns

### Testing Component Interactions

```typescript
import { describe, it, expect } from 'bun:test'
import { render, screen } from '@/test-utils'
import LoginForm from './LoginForm'

describe('Login Flow Integration', () => {
  it('should render all required elements', () => {
    render(<LoginForm />)
    
    expect(screen.getByText(/pengui/i)).toBeInTheDocument()
    expect(screen.getByText(/connect your wallet/i)).toBeInTheDocument()
  })
})
```

## E2E Test Patterns

### Using Page Objects

```typescript
import { test, expect } from '@playwright/test'
import { LoginPage } from '../page-objects/LoginPage'

test('login flow', async ({ page }) => {
  const loginPage = new LoginPage(page)
  await loginPage.goto()
  await loginPage.isVisible()
})
```

### Waiting for Elements

```typescript
test('waits for element', async ({ page }) => {
  await page.goto('/dashboard')
  // Use expect().toBeVisible() - it automatically waits
  await expect(page.getByTestId('balance-card')).toBeVisible()
})
```

## Test Data

### Using Factories

```typescript
import { createUser, createAsset } from '@/test-utils'

test('example', () => {
  const user = createUser({ name: 'Test User' })
  const asset = createAsset({ assetType: 'xch', balance: 1000 })
})
```

### Using Fixtures (E2E)

```typescript
import { testUsers } from '../fixtures/test-data'

test('example', async ({ page }) => {
  const user = testUsers.mainnet
  // Use user data
})
```

## Common Patterns

### Testing Edge Cases

```typescript
describe('edge cases', () => {
  it('should handle empty string', () => {
    expect(parseAmount('')).toBe(0)
  })

  it('should handle null', () => {
    expect(parseAmount(null)).toBe(0)
  })

  it('should handle very large numbers', () => {
    expect(formatXchAmount(Number.MAX_SAFE_INTEGER)).toBeTruthy()
  })
})
```

### Testing Error States

```typescript
it('should handle invalid input gracefully', () => {
  expect(() => parseAmount('invalid')).not.toThrow()
  expect(parseAmount('invalid')).toBe(0)
})
```

### Testing Async Operations

```typescript
it('should handle async operations', async () => {
  const result = await fetchData()
  expect(result).toBeDefined()
})
```

## Best Practices Summary

1. ✅ Test behavior, not implementation
2. ✅ Use descriptive test names
3. ✅ Follow Arrange-Act-Assert pattern
4. ✅ Test one thing per test
5. ✅ Test edge cases
6. ✅ Use test data factories
7. ✅ Mock external dependencies
8. ✅ Keep tests fast
9. ✅ Keep tests independent
10. ✅ Write tests that are easy to understand

## Anti-Patterns to Avoid

1. ❌ Testing implementation details
2. ❌ Vague test names
3. ❌ Multiple assertions testing different things
4. ❌ Tests that depend on each other
5. ❌ Slow tests (unit tests should be instant)
6. ❌ Not mocking external dependencies
7. ❌ Testing framework internals
8. ❌ Over-complicated test setup
