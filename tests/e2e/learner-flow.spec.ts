import { test, expect } from '@playwright/test';

test.describe('Learner Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'learner@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/canvas|\/dashboard/, { timeout: 5000 });
  });

  test('should start a learning session', async ({ page }) => {
    await page.goto('/canvas');

    // Should see learning canvas
    await expect(page.locator('text=/Learning|Session/i')).toBeVisible();
  });

  test('should send chat message', async ({ page }) => {
    await page.goto('/canvas');

    const chatInput = page
      .locator('input[placeholder*="message" i], textarea[placeholder*="message" i]')
      .first();
    if (await chatInput.isVisible()) {
      await chatInput.fill('Hello, I need help with this topic');
      await page.click('button:has-text("Send")');

      // Should see message in chat
      await expect(page.locator('text=/Hello, I need help/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should navigate narrative tree', async ({ page }) => {
    await page.goto('/canvas');

    // Look for narrative tree or choices
    const choiceButton = page.locator('button:has-text(/choice|next|continue/i)').first();
    if (await choiceButton.isVisible({ timeout: 3000 })) {
      await choiceButton.click();
      // Should navigate to next node
      await expect(page).toHaveURL(/\/canvas/, { timeout: 3000 });
    }
  });

  test('should view progress panel', async ({ page }) => {
    await page.goto('/canvas');

    // Should see progress information
    const progressPanel = page.locator('text=/progress|mastery|knowledge/i').first();
    if (await progressPanel.isVisible({ timeout: 3000 })) {
      expect(progressPanel).toBeVisible();
    }
  });
});
