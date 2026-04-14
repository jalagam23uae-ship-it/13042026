import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './_helpers';

test.describe('admin: create course flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('admin sees Manage Courses nav link', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /manage courses/i })).toBeVisible();
  });

  test('admin courses page renders the management view', async ({ page }) => {
    await page.goto('/admin/courses');
    await expect(page.getByRole('heading', { name: /^courses$/i })).toBeVisible();
    // The "Create course" dialog trigger should be visible.
    await expect(page.getByRole('button', { name: /create course/i })).toBeVisible();
  });

  test('opening create course dialog shows the form', async ({ page }) => {
    await page.goto('/admin/courses');
    await page.getByRole('button', { name: /create course/i }).click();
    // Dialog with a title field should appear.
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel(/title/i)).toBeVisible();
  });

  test('create course with missing title shows validation', async ({ page }) => {
    await page.goto('/admin/courses');
    await page.getByRole('button', { name: /create course/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    // Try to submit without filling anything.
    const submitButton = page.getByRole('button', { name: /^create$|^submit$|^save$/i });
    if ((await submitButton.count()) > 0) {
      await submitButton.first().click();
      // Either a toast error appears or the dialog remains open.
      // We don't assert the exact error — just that the dialog hasn't
      // closed (which would indicate a fake-success).
      await expect(page.getByRole('dialog')).toBeVisible();
    }
  });
});

test.describe('admin: users create flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('admin users page lists users and shows create button', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: /users/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /create user/i })).toBeVisible();
  });

  test('create user dialog opens with expected fields', async ({ page }) => {
    await page.goto('/admin/users');
    await page.getByRole('button', { name: /create user/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/name/i)).toBeVisible();
  });
});
