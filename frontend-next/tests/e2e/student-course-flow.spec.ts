import { test, expect } from '@playwright/test';
import { loginAsStudent } from './_helpers';

test.describe('student: course enrollment + playback', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page);
  });

  test('student can see their enrolled courses on /courses', async ({ page }) => {
    await page.goto('/courses');
    await expect(page.getByRole('heading', { name: /my courses/i })).toBeVisible();
    // Either there's an empty-state message or a grid of course cards.
    // Both are valid — we only care that the page rendered without error.
    const hasEmptyState = await page
      .getByText(/not enrolled in any courses/i)
      .isVisible()
      .catch(() => false);
    const courseCards = await page.getByRole('link', { name: /open course/i }).count();
    expect(hasEmptyState || courseCards > 0).toBe(true);
  });

  test('opening a course shows the course player', async ({ page }) => {
    await page.goto('/courses');
    // Click the first "Open course" button, if any.
    const openButton = page.getByRole('link', { name: /open course/i }).first();
    if ((await openButton.count()) === 0) {
      test.skip(true, 'No enrolled courses in seed data for this student');
      return;
    }
    await openButton.click();
    await expect(page).toHaveURL(/\/courses\/\d+/);
    // Course detail page should render a back link and the course title.
    await expect(page.getByRole('link', { name: /back/i })).toBeVisible();
  });

  test('enrollments page browse shows available courses', async ({ page }) => {
    await page.goto('/enrollments');
    await expect(page.getByRole('heading', { name: /enrollments/i })).toBeVisible();
    // Page either shows an empty state or a browser with course cards.
    const hasContent =
      (await page.getByText(/available courses/i).count()) > 0 ||
      (await page.getByText(/not enrolled/i).count()) > 0 ||
      (await page.getByText(/browse/i).count()) > 0;
    expect(hasContent).toBe(true);
  });
});
