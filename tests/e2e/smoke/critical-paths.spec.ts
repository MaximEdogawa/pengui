import { test, expect } from '@playwright/test'

/**
 * Minimal smoke tests - Quick checks that critical paths work
 * These tests verify basic functionality without requiring wallet connection
 */

test.describe('Critical Paths - Smoke Tests', () => {
  test('should load the login page', async ({ page }) => {
    await page.goto('/login')
    
    // Check that the page loads
    await expect(page).toHaveTitle(/pengui/i)
    
    // Check for key elements
    await expect(page.getByText(/pengui/i)).toBeVisible()
    await expect(page.getByText(/connect your wallet/i)).toBeVisible()
  })

  test('should load the home page', async ({ page }) => {
    await page.goto('/')
    
    // Verify page loads without errors
    await expect(page).not.toHaveURL(/error/)
  })
})
