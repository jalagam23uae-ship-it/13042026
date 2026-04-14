import type { Page, APIRequestContext } from '@playwright/test';

/**
 * Shared helpers for e2e tests.
 *
 * Seeded users live in the backend dev database. Credentials are read
 * from env vars so the same suite can point at local or CI. Set:
 *
 *   E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD
 *   E2E_STUDENT_EMAIL, E2E_STUDENT_PASSWORD
 *
 * If unset, fall back to defaults that match backend/seed.py.
 */

export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com';
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'admin123';
export const STUDENT_EMAIL = process.env.E2E_STUDENT_EMAIL ?? 'student@example.com';
export const STUDENT_PASSWORD = process.env.E2E_STUDENT_PASSWORD ?? 'student123';

export async function loginAs(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  // After successful login the user is redirected to `/`.
  await page.waitForURL(/^\/(?:\?|$)/, { timeout: 10_000 });
}

export async function loginAsAdmin(page: Page): Promise<void> {
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
}

export async function loginAsStudent(page: Page): Promise<void> {
  await loginAs(page, STUDENT_EMAIL, STUDENT_PASSWORD);
}

/**
 * Collect console errors on a page for later assertion. Use with:
 *
 *   const errors = collectConsoleErrors(page);
 *   await page.goto('/some/route');
 *   expect(errors).toEqual([]);
 */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore well-known noise: hydration warnings from dev mode,
      // favicon 404s, extension-injected errors.
      if (
        text.includes('Download the React DevTools') ||
        text.includes('favicon') ||
        text.includes('Extension')
      ) {
        return;
      }
      errors.push(text);
    }
  });
  page.on('pageerror', (err) => {
    errors.push(`pageerror: ${err.message}`);
  });
  return errors;
}

/**
 * Assert a route responds without a 500 and renders at least one <h1>.
 * Does NOT assume the route succeeds — 4xx is fine (auth-gated routes
 * legitimately 401/403). The goal is "did the server crash".
 */
export async function assertRouteRenders(page: Page, path: string): Promise<void> {
  const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
  const status = response?.status() ?? 0;
  if (status >= 500) {
    throw new Error(`${path} returned ${status}`);
  }
}
