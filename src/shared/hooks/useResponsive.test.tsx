import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { renderHook, cleanup } from '@testing-library/react'
import { useResponsive } from './useResponsive'
import { AllTheProviders } from '@/test-utils'

describe('useResponsive', () => {
  beforeEach(() => {
    // Reset window size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('should detect desktop view for large screens', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920,
    })

    const { result } = renderHook(() => useResponsive(), {
      wrapper: AllTheProviders,
    })

    expect(result.current.isDesktop).toBe(true)
    expect(result.current.isMobile).toBe(false)
    expect(result.current.isTablet).toBe(false)
  })

  it('should detect mobile view for small screens', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 800,
    })

    const { result } = renderHook(() => useResponsive(), {
      wrapper: AllTheProviders,
    })

    expect(result.current.isMobile).toBe(true)
    expect(result.current.isDesktop).toBe(false)
  })

  it('should detect tablet view for medium screens', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 900,
    })

    const { result } = renderHook(() => useResponsive(), {
      wrapper: AllTheProviders,
    })

    expect(result.current.isTablet).toBe(true)
    expect(result.current.isMobile).toBe(true)
    expect(result.current.isDesktop).toBe(false)
  })

  it('should update on window resize', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920,
    })

    const { result, rerender } = renderHook(() => useResponsive(), {
      wrapper: AllTheProviders,
    })

    expect(result.current.isDesktop).toBe(true)

    // Simulate resize to mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 800,
    })

    // Trigger resize event manually
    window.dispatchEvent(new Event('resize'))
    rerender()

    expect(result.current.isMobile).toBe(true)
    expect(result.current.isDesktop).toBe(false)
  })

  it('should handle boundary values correctly', () => {
    // Test at exactly 1024px (should be desktop)
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })

    const { result } = renderHook(() => useResponsive(), {
      wrapper: AllTheProviders,
    })

    expect(result.current.isDesktop).toBe(true)
    expect(result.current.isMobile).toBe(false)

    // Test at 1023px (should be mobile)
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1023,
    })

    const { result: result2 } = renderHook(() => useResponsive(), {
      wrapper: AllTheProviders,
    })

    expect(result2.current.isMobile).toBe(true)
    expect(result2.current.isDesktop).toBe(false)
  })
})
