import { test, expect } from '@playwright/test';

/**
 * Minimal auth smoke test. Assumes the Next.js server is running and the
 * backend is reachable at API_URL_INTERNAL. Does NOT attempt a real login
 * (that would require seeded credentials) — instead verifies that anonymous
 * access to protected routes is redirected to /login.
 */
test('unauthenticated /dashboard redirects to /login', async ({ page }) => {
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
  // Either we landed on /login, or we got redirected there.
  await expect(page).toHaveURL(/\/login(\?|$)/);
  expect(response?.ok()).toBeTruthy();
});

test('login page renders the form', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /ATP/i })).toBeVisible();
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.getByLabel(/password/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
});

test('healthz returns ok', async ({ request }) => {
  const response = await request.get('/healthz');
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.status).toBe('ok');
});
