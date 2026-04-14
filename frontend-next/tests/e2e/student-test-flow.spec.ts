import { test, expect } from '@playwright/test';
import { loginAsStudent } from './_helpers';

test.describe('student: test list + taking a test', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page);
  });

  test('tests page lists available tests', async ({ page }) => {
    await page.goto('/tests');
    await expect(page.getByRole('heading', { name: /tests/i })).toBeVisible();
    // Either shows "No tests available" or a table of tests.
    const hasEmpty = await page.getByText(/no tests available/i).isVisible().catch(() => false);
    const hasTable = await page.getByRole('table').isVisible().catch(() => false);
    expect(hasEmpty || hasTable).toBe(true);
  });

  test('start button navigates to the test runner', async ({ page }) => {
    await page.goto('/tests');
    const startButton = page.getByRole('link', { name: /start/i }).first();
    if ((await startButton.count()) === 0) {
      test.skip(true, 'No startable tests in seed data');
      return;
    }
    await startButton.click();
    await expect(page).toHaveURL(/\/tests\/\d+/);
    // The runner should have a back link — confirms the route rendered.
    await expect(page.getByRole('link', { name: /back/i })).toBeVisible();
  });
});
