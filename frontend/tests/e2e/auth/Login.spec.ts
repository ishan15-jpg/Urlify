import { test, expect } from '@playwright/test';

test.describe('Login Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('shows validation errors when submitting an empty form', async ({ page }) => {
    // Click submit without filling anything
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Verify error messages using exact matches
    await expect(page.getByText('Email address is required', { exact: true })).toBeVisible();
    await expect(page.getByText('Password is required', { exact: true })).toBeVisible();
  });

  test('shows invalid email format error', async ({ page }) => {
    await page.locator('#login-email').fill('not-an-email');
    await page.locator('#login-password').fill('password123');

    await page.getByRole('button', { name: 'Sign In' }).click();

    // Verify error message
    await expect(page.getByText('Invalid email format', { exact: true })).toBeVisible();
  });

  test('shows global error message when API fails (e.g., unauthorized)', async ({ page }) => {
    // Mock the API failure
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Invalid email or password',
          error: 'Unauthorized'
        }),
      });
    });

    // Fill valid form
    await page.locator('#login-email').fill('test@example.com');
    await page.locator('#login-password').fill('StrongP@ssw0rd1');

    // Submit
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Verify global error is visible
    await expect(page.getByText('Invalid email or password').first()).toBeVisible();
  });

  test('redirects to home and saves token upon successful login', async ({ page }) => {
    // Mock the API success
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Login successful',
          data: {
            user: { id: '123' },
            accessToken: 'dummy.jwt.token'
          }
        }),
      });
    });

    // Fill valid form
    await page.locator('#login-email').fill('test@example.com');
    await page.locator('#login-password').fill('StrongP@ssw0rd1');

    // Submit
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for the success toast
    await expect(page.getByText('Login successful').first()).toBeVisible();

    // Should redirect to /
    await expect(page).toHaveURL(/\//);

    // Verify localStorage has the token
    const token = await page.evaluate(() => localStorage.getItem('access-token'));
    expect(token).toBe('dummy.jwt.token');
  });
});
