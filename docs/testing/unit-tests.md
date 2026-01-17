# Unit Tests Guide

## Overview

Unit tests test individual functions, utilities, hooks, and components in isolation. They should be fast, focused, and test one thing at a time.

## When to Write Unit Tests

Write unit tests for:
- ✅ Pure functions (no side effects)
- ✅ Utility functions (formatting, validation, calculations)
- ✅ React hooks (custom hooks)
- ✅ Service classes and methods
- ✅ Business logic
- ✅ Component rendering and basic interactions

Don't write unit tests for:
- ❌ Complex integration scenarios (use integration tests)
- ❌ Full user workflows (use E2E tests)
- ❌ External API calls (mock them)

## Test Structure

### Basic Test Structure

```typescript
import { describe, it, expect } from 'bun:test'
import { functionToTest } from './module'

describe('functionToTest', () => {
  it('should do something specific', () => {
    const result = functionToTest(input)
    expect(result).toBe(expectedOutput)
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
    const handleClick = () => {}
    let clicked = false
    const onClick = () => { clicked = true }

    render(<Button onClick={onClick}>Click me</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(clicked).toBe(true)
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
    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 800,
    })

    const { result } = renderHook(() => useResponsive())
    expect(result.current.isMobile).toBe(true)
  })
})
```

## Test Utilities

### renderWithProviders

Use `renderWithProviders` to render components with all necessary providers:

```typescript
import { renderWithProviders } from '@/test-utils'

test('component with providers', () => {
  renderWithProviders(<Component />)
})
```

### Test Data Factories

Use factories to create consistent test data:

```typescript
import { createUser, createAsset } from '@/test-utils'

test('example', () => {
  const user = createUser({ name: 'Test User' })
  const asset = createAsset({ assetType: 'xch', balance: 1000 })
})
```

## Best Practices

1. **One assertion per test** (when possible)
2. **Test one thing at a time**
3. **Use descriptive test names** - "should convert XCH to mojos correctly"
4. **Arrange-Act-Assert pattern**
5. **Mock external dependencies**
6. **Test edge cases** - empty strings, null, undefined, boundaries
7. **Keep tests fast** - should complete in milliseconds

## Example: Testing a Utility Function

```typescript
// src/shared/lib/formatting/chia-units.test.ts
import { describe, it, expect } from 'bun:test'
import { xchToMojos, mojosToXch } from './chia-units'

describe('chia-units', () => {
  describe('xchToMojos', () => {
    it('should convert 1 XCH to 1 trillion mojos', () => {
      expect(xchToMojos(1)).toBe(1_000_000_000_000)
    })

    it('should convert 0.5 XCH correctly', () => {
      expect(xchToMojos(0.5)).toBe(500_000_000_000)
    })

    it('should handle zero', () => {
      expect(xchToMojos(0)).toBe(0)
    })
  })

  describe('mojosToXch', () => {
    it('should convert mojos to XCH correctly', () => {
      expect(mojosToXch(1_000_000_000_000)).toBe(1)
    })
  })
})
```

## Running Unit Tests

```bash
# Run all unit tests
bun run test:unit

# Run in watch mode
bun run test:watch

# Run with coverage
bun run test:coverage
```
