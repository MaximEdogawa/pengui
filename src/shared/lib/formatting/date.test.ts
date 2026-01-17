import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { formatRelativeTime } from './date'

describe('date formatting', () => {
  let mockNow: number
  let originalDate: typeof Date
  let originalDateNow: typeof Date.now

  beforeEach(() => {
    // Store original Date and Date.now before mocking
    originalDate = Date
    originalDateNow = Date.now
    // Set fixed time for tests
    mockNow = 1700000000000 // Fixed timestamp: 2023-11-14
    // Mock Date.now to return fixed time
    Date.now = () => mockNow
    // Mock Date constructor to use our fixed time when called without arguments
    // @ts-expect-error - We're intentionally overriding Date constructor
    global.Date = class extends Date {
      constructor(...args: unknown[]) {
        if (args.length === 0) {
          super(mockNow)
        } else {
          super(...(args as []))
        }
      }
      static now() {
        return mockNow
      }
    } as typeof Date
    // Ensure Date.now is also mocked
    Date.now = () => mockNow
  })

  afterEach(() => {
    // Restore original Date and Date.now
    global.Date = originalDate
    Date.now = originalDateNow
  })

  describe('formatRelativeTime', () => {
    it('should return "Just now" for very recent timestamps', () => {
      const timestamp = mockNow - 30 * 1000 // 30 seconds ago
      expect(formatRelativeTime(timestamp)).toBe('Just now')
    })

    it('should format minutes ago', () => {
      const timestamp = mockNow - 5 * 60 * 1000 // 5 minutes ago
      expect(formatRelativeTime(timestamp)).toBe('5m ago')

      const timestamp2 = mockNow - 30 * 60 * 1000 // 30 minutes ago
      expect(formatRelativeTime(timestamp2)).toBe('30m ago')
    })

    it('should format hours ago', () => {
      const timestamp = mockNow - 2 * 60 * 60 * 1000 // 2 hours ago
      expect(formatRelativeTime(timestamp)).toBe('2h ago')

      const timestamp2 = mockNow - 12 * 60 * 60 * 1000 // 12 hours ago
      expect(formatRelativeTime(timestamp2)).toBe('12h ago')
    })

    it('should format days ago', () => {
      const timestamp = mockNow - 2 * 24 * 60 * 60 * 1000 // 2 days ago
      expect(formatRelativeTime(timestamp)).toBe('2d ago')

      const timestamp2 = mockNow - 6 * 24 * 60 * 60 * 1000 // 6 days ago
      expect(formatRelativeTime(timestamp2)).toBe('6d ago')
    })

    it('should return locale date string for older dates', () => {
      const timestamp = mockNow - 8 * 24 * 60 * 60 * 1000 // 8 days ago
      const result = formatRelativeTime(timestamp)
      // Should return a date string, not relative time
      expect(result).not.toContain('ago')
      expect(result).not.toContain('Just now')
    })
  })
})
