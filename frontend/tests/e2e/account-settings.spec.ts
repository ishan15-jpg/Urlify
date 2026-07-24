import { test, expect } from '@playwright/test';

test.describe('Account Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept the /me endpoint to return an unverified user profile
    await page.route('**/users/me*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          statusCode: 200,
          data: {
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
              name: 'Test User',
              role: 'user',
              isEmailVerified: false
            }
          }
        })
      });
    });

    await page.goto('/');
    // Inject mock token just in case
    await page.evaluate(() => {
      localStorage.setItem('access-token', 'mock-token');
    });
    await page.goto('/account-settings');
  });

  test('Verify Email button is rendered and clickable', async ({ page }) => {
    const verifyButton = page.getByRole('button', { name: 'Verify Email' });
    await expect(verifyButton).toBeVisible();
    await expect(verifyButton).toBeEnabled();
  });

  test('Verify Email button becomes visually disabled in edit mode', async ({ page }) => {
    // Click the Edit icon
    const editButton = page.getByRole('button', { name: 'Edit profile' });
    await editButton.click();

    // Now Verify Email button should have pointer-events-none and opacity-50
    const verifyButton = page.getByRole('button', { name: 'Verify Email' });
    
    // We expect it to have the class `pointer-events-none`
    await expect(verifyButton).toHaveClass(/pointer-events-none/);
    await expect(verifyButton).toHaveClass(/opacity-50/);
  });

  test('Clicking Verify Email shows loading state and success toast', async ({ page }) => {
    // Intercept the verification link API call
    await page.route('**/auth/email-verification-link', async route => {
      await new Promise(resolve => setTimeout(resolve, 500)); // Delay for loading state
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          statusCode: 200,
          message: 'Verification link sent to your email'
        })
      });
    });

    const verifyButton = page.getByRole('button', { name: 'Verify Email' });
    await verifyButton.click();

    // It should change to "Sending..."
    await expect(page.getByRole('button', { name: 'Sending...' })).toBeVisible();

    // It should eventually show the success toast
    await expect(page.getByText('Verification email sent successfully!')).toBeVisible();
    
    // It should go back to "Verify Email" after completion
    await expect(page.getByRole('button', { name: 'Verify Email' })).toBeVisible();
  });

  test('Clicking Verify Email shows error toast on failure', async ({ page }) => {
    // Intercept the verification link API call with failure
    await page.route('**/auth/email-verification-link', async route => {
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          statusCode: 400,
          message: 'Rate limit exceeded, please try again later.'
        })
      });
    });

    const verifyButton = page.getByRole('button', { name: 'Verify Email' });
    await verifyButton.click();

    // It should change to "Sending..."
    await expect(page.getByRole('button', { name: 'Sending...' })).toBeVisible();

    // It should eventually show the error toast
    await expect(page.getByText('Rate limit exceeded, please try again later.')).toBeVisible();
    
    // It should go back to "Verify Email"
    await expect(page.getByRole('button', { name: 'Verify Email' })).toBeVisible();
  });
});
