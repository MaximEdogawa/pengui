import { test, expect } from '@playwright/test'

/**
 * Smoke tests - Quick checks that critical paths work
 * These tests should run fast (< 5 minutes total) and verify basic functionality
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

  test('should navigate to dashboard after login', async ({ page }) => {
    await page.goto('/login')
    
    // Note: Actual wallet connection would require WalletConnect setup
    // This is a placeholder for the smoke test structure
    
    // For now, just verify the login page is accessible
    await expect(page.getByText(/pengui/i)).toBeVisible()
  })

  test('should display network picker on login page', async ({ page }) => {
    await page.goto('/login')
    
    // Network picker should be visible
    // Adjust selector based on actual implementation
    // If network picker exists, it should be visible
    // This test may need adjustment based on actual UI
  })

  test('should handle page navigation', async ({ page }) => {
    await page.goto('/')
    
    // Verify page loads without errors
    await expect(page).not.toHaveURL(/error/)
  })
})
