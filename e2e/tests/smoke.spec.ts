import { test, expect } from '@playwright/test';

// --- Unauthenticated tests ---

test('api health check', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.status()).toBe(200);
});

test('unauthenticated shows login page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Tactic Monster' })).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.google-signin')).toBeVisible();
  await expect(page.locator('.tab-bar')).not.toBeVisible();
});

// --- Authenticated tests ---

test.describe('authenticated', () => {
  test.beforeEach(async ({ page, request }) => {
    const response = await request.post('/api/auth/test-login', {
      headers: { 'X-Test-Auth-Key': process.env.TEST_AUTH_KEY || '' },
    });
    expect(response.status()).toBe(200);

    // Transfer session cookie to the browser context
    const cookies = (await response.headersArray())
      .filter(h => h.name.toLowerCase() === 'set-cookie')
      .map(h => {
        const parts = h.value.split(';')[0].split('=');
        return {
          name: parts[0],
          value: parts.slice(1).join('='),
          url: page.url() || 'http://localhost',
        };
      });

    if (cookies.length > 0) {
      await page.context().addCookies(
        cookies.map(c => ({ ...c, url: response.url() }))
      );
    }
  });

  test('authenticated home shows puzzle tab by default', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Tactic Monster' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.user-bar')).toContainText('Test User');
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Stats' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Play' })).toHaveClass(/active/);
  });

  test('chessboard renders with puzzle', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.board-wrapper')).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText('Find the best move').or(page.getByText('Loading puzzle...'))
    ).toBeVisible({ timeout: 15000 });
  });

  test('can switch to stats tab', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Stats' }).click();
    await expect(
      page.locator('.stats-container').or(page.getByText('Loading stats...'))
    ).toBeVisible({ timeout: 10000 });
  });

  test('stats page shows summary cards', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Stats' }).click();
    await expect(page.locator('.stats-container')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Attempted')).toBeVisible();
    await expect(page.getByText('Correct')).toBeVisible();
    await expect(page.getByText('Accuracy')).toBeVisible();
    await expect(page.getByText('Elo Rating')).toBeVisible();
  });

  test('can switch back to play tab', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Stats' }).click();
    await expect(page.locator('.stats-container').or(page.getByText('Loading stats...'))).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Play' }).click();
    await expect(page.locator('.board-wrapper')).toBeVisible({ timeout: 10000 });
  });
});
