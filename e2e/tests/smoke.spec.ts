import { test, expect } from '@playwright/test';

test('home page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading')).toBeVisible({ timeout: 10000 });
});

test('api health check', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.status()).toBe(200);
});
