import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should register a new user', async ({ page }) => {
    await page.goto('/register');

    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="confirmPassword"]', 'password123');

    await page.click('button[type="submit"]');

    // Should redirect to login or dashboard
    await expect(page).toHaveURL(/\/login|\/dashboard/, { timeout: 5000 });
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');

    await page.click('button[type="submit"]');

    // Should redirect to dashboard or learner canvas
    await expect(page).toHaveURL(/\/dashboard|\/canvas/, { timeout: 5000 });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');

    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=/invalid|error/i')).toBeVisible({ timeout: 3000 });
  });

  test('should logout successfully', async ({ page }) => {
    // First login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for login to complete
    await page.waitForURL(/\/dashboard|\/canvas/, { timeout: 5000 });

    // Click logout
    await page.click('button:has-text("Logout")');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});
