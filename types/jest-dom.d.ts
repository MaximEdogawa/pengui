/**
 * Type definitions for @testing-library/jest-dom matchers
 * Extends Bun's test expect types with jest-dom matchers
 */

import '@testing-library/jest-dom'

declare module 'bun:test' {
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
    // jest-dom matchers
    toBeInTheDocument(): void
    toBeVisible(): void
    toBeDisabled(): void
    toBeEnabled(): void
    toBeRequired(): void
    toHaveAttribute(attr: string, value?: string): void
    toHaveClass(...classNames: string[]): void
    toHaveTextContent(text: string | RegExp): void
    toHaveValue(value: string | number | string[]): void
    toBeChecked(): void
    toBePartiallyChecked(): void
    toHaveFocus(): void
    toHaveFormValues(values: Record<string, unknown>): void
    toHaveStyle(css: string | Record<string, unknown>): void
    toBeInvalid(): void
    toBeValid(): void
    toBeEmptyDOMElement(): void
    toContainElement(element: HTMLElement | null): void
    toContainHTML(html: string): void
    toHaveAccessibleDescription(description: string | RegExp): void
    toHaveAccessibleName(name: string | RegExp): void
    toHaveDescription(description: string | RegExp): void
    toHaveDisplayValue(value: string | RegExp | (string | RegExp)[]): void
    toHaveErrorMessage(message: string | RegExp): void
    toHaveRole(role: string, options?: unknown): void
    toBeEmpty(): void
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
      // jest-dom matchers
      toBeInTheDocument(): void
      toBeVisible(): void
      toBeDisabled(): void
      toBeEnabled(): void
      toBeRequired(): void
      toHaveAttribute(attr: string, value?: string): void
      toHaveClass(...classNames: string[]): void
      toHaveTextContent(text: string | RegExp): void
      toHaveValue(value: string | number | string[]): void
      toBeChecked(): void
      toBePartiallyChecked(): void
      toHaveFocus(): void
      toHaveFormValues(values: Record<string, unknown>): void
      toHaveStyle(css: string | Record<string, unknown>): void
      toBeInvalid(): void
      toBeValid(): void
      toBeEmptyDOMElement(): void
      toContainElement(element: HTMLElement | null): void
      toContainHTML(html: string): void
      toHaveAccessibleDescription(description: string | RegExp): void
      toHaveAccessibleName(name: string | RegExp): void
      toHaveDescription(description: string | RegExp): void
      toHaveDisplayValue(value: string | RegExp | (string | RegExp)[]): void
      toHaveErrorMessage(message: string | RegExp): void
      toHaveRole(role: string, options?: unknown): void
      toBeEmpty(): void
    }
  }
}
