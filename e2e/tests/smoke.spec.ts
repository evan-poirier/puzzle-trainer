import { test, expect } from '@playwright/test';

test('home page loads', async ({ page }) => {
  await page.goto('/');
  // Matches either the loading state ("Puzzle Trainer") or the logged-out state ("Tactic Monster")
  await expect(page.getByRole('heading')).toBeVisible({ timeout: 15000 });
});

test('app reaches logged-out state', async ({ page }) => {
  await page.goto('/');
  // Wait for auth check to complete and show the logged-out view
  await expect(page.getByRole('heading', { name: 'Tactic Monster' })).toBeVisible({ timeout: 15000 });
});

test('google sign in button visible when logged out', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Tactic Monster' })).toBeVisible({ timeout: 15000 });
  // Google OAuth button renders inside an iframe
  const googleBtn = page.frameLocator('iframe[src*="accounts.google.com"]').first();
  await expect(googleBtn.getByRole('button')).toBeVisible({ timeout: 15000 });
});
