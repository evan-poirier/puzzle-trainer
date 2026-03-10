import { test, expect } from '@playwright/test';

test('home page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Tactic Monster' })).toBeVisible();
});

test('google sign in button visible when logged out', async ({ page }) => {
  await page.goto('/');
  // Wait for loading state to resolve
  await expect(page.getByRole('heading', { name: 'Tactic Monster' })).toBeVisible();
  // Google OAuth button renders inside an iframe
  const googleBtn = page.frameLocator('iframe[src*="accounts.google.com"]').first();
  await expect(googleBtn.getByRole('button')).toBeVisible({ timeout: 10000 });
});
