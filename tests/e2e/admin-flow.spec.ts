import { test, expect } from '@playwright/test';

test.describe('Admin Console Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/console|\/dashboard/, { timeout: 5000 });
  });

  test('should access admin console', async ({ page }) => {
    await page.goto('/console');

    // Should see admin console
    await expect(page.locator('text=/admin|console|dashboard/i')).toBeVisible();
  });

  test('should manage content ingestion folders', async ({ page }) => {
    await page.goto('/console/ingestion');

    // Should see ingestion management UI
    await expect(page.locator('text=/ingestion|folder|url/i')).toBeVisible();
  });

  test('should view nuggets', async ({ page }) => {
    await page.goto('/console/nuggets');

    // Should see nuggets list
    await expect(page.locator('text=/nugget|content|learning/i')).toBeVisible();
  });

  test('should access settings', async ({ page }) => {
    await page.goto('/console/settings');

    // Should see settings page
    await expect(page.locator('text=/settings|configuration/i')).toBeVisible();
  });
});
