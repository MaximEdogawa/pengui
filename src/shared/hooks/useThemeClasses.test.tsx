import { describe, it, expect } from 'bun:test'
import { renderHook } from '@testing-library/react'
import { useThemeClasses } from './useThemeClasses'
import { AllTheProviders } from '@/test-utils'

describe('useThemeClasses', () => {
  it('should return theme classes and dark mode state', () => {
    const { result } = renderHook(() => useThemeClasses(), {
      wrapper: AllTheProviders,
    })

    expect(result.current).toHaveProperty('isDark')
    expect(result.current).toHaveProperty('t')
    expect(typeof result.current.isDark).toBe('boolean')
    expect(result.current.t).toHaveProperty('bg')
    expect(result.current.t).toHaveProperty('text')
    expect(result.current.t).toHaveProperty('card')
  })

  // Note: Testing specific theme values would require mocking next-themes
  // The hook is tested through integration with components that use it
})
