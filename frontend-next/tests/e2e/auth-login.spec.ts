import { test, expect } from '@playwright/test';
import { loginAsStudent, STUDENT_EMAIL } from './_helpers';

test.describe('auth: login + logout', () => {
  test('login with valid credentials redirects to /', async ({ page }) => {
    await loginAsStudent(page);
    // After login we should be on the dashboard with the user visible
    // in the topbar.
    await expect(page).toHaveURL(/^\/(?:\?|$)/);
    // Topbar typically shows the first few characters of the email or
    // the user's initials — assert the page is no longer a login form.
    await expect(page.getByLabel(/password/i)).toHaveCount(0);
  });

  test('login with wrong password shows an error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(STUDENT_EMAIL);
    await page.getByLabel(/password/i).fill('definitely-wrong-password');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Form error should appear and we should still be on /login.
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText(/invalid email or password/i)).toBeVisible({
      timeout: 5_000,
    });
  });

  test('login with malformed email shows field error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('not-an-email');
    await page.getByLabel(/password/i).fill('something');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Zod validation from app/actions/auth.ts should surface a field
    // error. Don't match the exact string — just ensure the error area
    // mentions "email".
    await expect(page.getByText(/valid email/i)).toBeVisible({ timeout: 5_000 });
  });

  test('logout redirects back to /login', async ({ page }) => {
    await loginAsStudent(page);

    // The topbar has a "Log out" entry either directly or in a user menu.
    // Try the direct button first; if it isn't visible, open the menu.
    const directButton = page.getByRole('button', { name: /log out|sign out/i });
    if ((await directButton.count()) > 0) {
      await directButton.first().click();
    } else {
      // Fallback: open user menu by clicking the avatar/user button.
      const userButton = page.getByRole('button', { name: /account|profile|user/i });
      await userButton.first().click();
      await page.getByRole('menuitem', { name: /log out|sign out/i }).click();
    }

    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  });
});
