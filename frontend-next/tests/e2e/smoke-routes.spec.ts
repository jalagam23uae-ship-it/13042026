import { test, expect } from '@playwright/test';
import {
  loginAsAdmin,
  loginAsStudent,
  collectConsoleErrors,
  assertRouteRenders,
} from './_helpers';

/**
 * Smoke suite — the highest-leverage e2e in the project.
 *
 * Visits every top-level route and asserts:
 *   1. the response is not a 5xx,
 *   2. no uncaught `console.error` fires,
 *   3. at least one <h1> is present,
 *   4. the URL has not been redirected to /login (which would indicate
 *      the auth gate is misfiring).
 *
 * This catches ~80% of regressions for ~20% of the effort — "I deleted
 * an import and didn't notice" bugs surface immediately.
 *
 * Routes that legitimately 401/403 are NOT run against the admin sweep;
 * they live in the student sweep or vice versa.
 */

const STUDENT_ROUTES = [
  '/',
  '/courses',
  '/progress',
  '/tests',
  '/assignments',
  '/sessions',
  '/attendance',
  '/enrollments',
  '/certificates',
  '/learning-paths',
  '/calendar',
  '/discussions',
  '/notes',
  '/reviews',
  '/time-tracking',
  '/notifications',
  '/wishlist',
  '/announcements',
  '/feedback',
  '/search',
  '/ai-assistant',
  '/profile',
];

const ADMIN_ROUTES = [
  ...STUDENT_ROUTES,
  '/admin/courses',
  '/admin/users',
  '/admin/reports',
  '/admin/analytics',
  '/admin/audit-logs',
  '/admin/approvals',
  '/admin/student-tracking',
  '/admin/notifications',
  '/admin/discussions',
  '/admin/settings',
];

test.describe('smoke: student routes', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page);
  });

  for (const route of STUDENT_ROUTES) {
    test(`renders ${route}`, async ({ page }) => {
      const consoleErrors = collectConsoleErrors(page);
      await assertRouteRenders(page, route);

      // Should not have been bounced back to /login — would indicate the
      // session cookie was cleared or rejected mid-flow.
      expect(page.url()).not.toMatch(/\/login/);

      // At least one <h1> proves the layout actually rendered.
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBeGreaterThan(0);

      // No uncaught errors.
      expect(consoleErrors, `Console errors on ${route}:\n${consoleErrors.join('\n')}`).toEqual([]);
    });
  }
});

test.describe('smoke: admin routes', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  for (const route of ADMIN_ROUTES) {
    test(`renders ${route}`, async ({ page }) => {
      const consoleErrors = collectConsoleErrors(page);
      await assertRouteRenders(page, route);
      expect(page.url()).not.toMatch(/\/login/);
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBeGreaterThan(0);
      expect(consoleErrors, `Console errors on ${route}:\n${consoleErrors.join('\n')}`).toEqual([]);
    });
  }
});

test.describe('smoke: role gates', () => {
  test('student is redirected away from /admin/users', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/admin/users');
    // Backend redirects non-admins to `/` — verify we either land there
    // or got a 4xx.
    await expect(page).toHaveURL(/^\/(?:\?|$)|\/admin\/users/);
    // If we're still on /admin/users, the page should not show the
    // admin-only "Create user" button.
    if (page.url().includes('/admin/users')) {
      await expect(page.getByRole('button', { name: /create user/i })).toHaveCount(0);
    }
  });

  test('student is redirected away from /admin/settings', async ({ page }) => {
    await loginAsStudent(page);
    const response = await page.goto('/admin/settings');
    expect(response?.status() ?? 0).toBeLessThan(500);
    // We expect a redirect to `/`, not a 500.
    await expect(page).toHaveURL(/^\/(?:\?|$)/);
  });
});
