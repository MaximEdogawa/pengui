/**
 * Type definitions for @testing-library/jest-dom matchers
 * Extends Bun's test expect types with jest-dom matchers using module augmentation
 */

import '@testing-library/jest-dom'

declare module 'bun:test' {
  interface Matchers<R> {
    // jest-dom matchers
    toBeInTheDocument(): R
    toBeVisible(): R
    toBeDisabled(): R
    toBeEnabled(): R
    toBeRequired(): R
    toHaveAttribute(attr: string, value?: string): R
    toHaveClass(...classNames: string[]): R
    toHaveTextContent(text: string | RegExp): R
    toHaveValue(value: string | number | string[]): R
    toBeChecked(): R
    toBePartiallyChecked(): R
    toHaveFocus(): R
    toHaveFormValues(values: Record<string, unknown>): R
    toHaveStyle(css: string | Record<string, unknown>): R
    toBeInvalid(): R
    toBeValid(): R
    toBeEmptyDOMElement(): R
    toContainElement(element: HTMLElement | null): R
    toContainHTML(html: string): R
    toHaveAccessibleDescription(description: string | RegExp): R
    toHaveAccessibleName(name: string | RegExp): R
    toHaveDescription(description: string | RegExp): R
    toHaveDisplayValue(value: string | RegExp | (string | RegExp)[]): R
    toHaveErrorMessage(message: string | RegExp): R
    toHaveRole(role: string, options?: unknown): R
    toBeEmpty(): R
  }

  interface AsymmetricMatchers {
    // Add any asymmetric matcher types if needed
  }
}
