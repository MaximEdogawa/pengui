/**
 * Type definitions for Bun's built-in test module
 */

declare module 'bun:test' {
  export function describe(name: string, fn: () => void): void
  export function it(name: string, fn: () => void | Promise<void>): void
  export function test(name: string, fn: () => void | Promise<void>): void
  export function expect(value: unknown): {
    toBe(expected: unknown): void
    toEqual(expected: unknown): void
    toBeTruthy(): void
    toBeFalsy(): void
    toBeDefined(): void
    toBeUndefined(): void
    toBeNull(): void
    toBeNaN(): void
    toBeGreaterThan(expected: number): void
    toBeGreaterThanOrEqual(expected: number): void
    toBeLessThan(expected: number): void
    toBeLessThanOrEqual(expected: number): void
    toContain(expected: unknown): void
    toMatch(expected: string | RegExp): void
    toThrow(expected?: string | RegExp | (() => void)): void
    toHaveLength(expected: number): void
    toHaveProperty(property: string, value?: unknown): void
    not: {
      toBe(expected: unknown): void
      toEqual(expected: unknown): void
      toBeTruthy(): void
      toBeFalsy(): void
      toBeDefined(): void
      toBeUndefined(): void
      toBeNull(): void
      toContain(expected: unknown): void
      toMatch(expected: string | RegExp): void
      toThrow(expected?: string | RegExp | (() => void)): void
    }
  }
  export function beforeEach(fn: () => void | Promise<void>): void
  export function afterEach(fn: () => void | Promise<void>): void
  export function beforeAll(fn: () => void | Promise<void>): void
  export function afterAll(fn: () => void | Promise<void>): void
}
