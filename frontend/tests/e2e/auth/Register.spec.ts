import { test, expect } from '@playwright/test';

test.describe('Register Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('shows validation errors when submitting an empty form', async ({ page }) => {
    // Click submit without filling anything
    await page.getByRole('button', { name: 'Create Account' }).click();

    // Verify error messages using exact matches to avoid strict mode violations
    await expect(page.getByText('Full name is required', { exact: true })).toBeVisible();
    await expect(page.getByText('Email address is required', { exact: true })).toBeVisible();
    await expect(page.getByText('Password is required', { exact: true })).toBeVisible();
    await expect(page.getByText('Confirm password is required', { exact: true })).toBeVisible();
  });

  test('shows password mismatch error', async ({ page }) => {
    // Fill the form with mismatched passwords
    await page.locator('#full_name').fill('Test User');
    await page.locator('#email').fill('test@example.com');
    await page.locator('#password').fill('StrongP@ssw0rd1');
    await page.locator('#confirm_password').fill('DifferentPassword1!');
    
    // Check terms
    await page.locator('#terms').check();

    // Submit
    await page.getByRole('button', { name: 'Create Account' }).click();

    // Verify error message
    await expect(page.getByText('Passwords do not match', { exact: true })).toBeVisible();
  });

  test('shows global error message when API fails', async ({ page }) => {
    // Mock the API failure
    await page.route('**/auth/register', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Email is already in use'
        }),
      });
    });

    // Fill valid form
    await page.locator('#full_name').fill('Test User');
    await page.locator('#email').fill('test@example.com');
    await page.locator('#password').fill('StrongP@ssw0rd1');
    await page.locator('#confirm_password').fill('StrongP@ssw0rd1');
    await page.locator('#terms').check();

    // Submit
    await page.getByRole('button', { name: 'Create Account' }).click();

    // Verify global error is visible (we use .first() because it appears in both a toast and the error banner)
    await expect(page.getByText('Email is already in use').first()).toBeVisible();
  });

  test('redirects to login upon successful registration', async ({ page }) => {
    // Mock the API success
    await page.route('**/auth/register', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Account created successfully'
        }),
      });
    });

    // Fill valid form
    await page.locator('#full_name').fill('Test User');
    await page.locator('#email').fill('test@example.com');
    await page.locator('#password').fill('StrongP@ssw0rd1');
    await page.locator('#confirm_password').fill('StrongP@ssw0rd1');
    await page.locator('#terms').check();

    // Submit
    await page.getByRole('button', { name: 'Create Account' }).click();

    // Wait for the success toast
    await expect(page.getByText('Registration successful. Redirecting...')).toBeVisible();

    // Should redirect to /login
    await expect(page).toHaveURL(/\/login/);
  });
});
