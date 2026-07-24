import { test, expect } from '@playwright/test';

test.describe('Email Verification Page', () => {
  test('redirects to homepage when token is missing', async ({ page }) => {
    // Go to the page without a token in the URL
    await page.goto('/verify-email');
    
    // Check if we are redirected to the homepage
    await expect(page).toHaveURL('/');
  });

  test('displays loading state and then success state upon successful verification', async ({ page }) => {
    // Intercept the API call and delay the response to check the loading state
    await page.route('**/auth/verify-email', async route => {
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          statusCode: 200,
          message: 'Email verified successfully',
          data: {
            email: 'user@example.com',
            isEmailVerified: true
          }
        })
      });
    });

    // Go to the page with a token
    await page.goto('/verify-email?token=valid-token');

    // Should display loading state first
    await expect(page.getByText('Verifying Email...')).toBeVisible();
    await expect(page.getByText('Please wait while we verify your email address.')).toBeVisible();

    // After response, should display success state
    await expect(page.getByText('Email Verified!')).toBeVisible();
    await expect(page.getByText('Your email has been successfully verified. You can now access all features of your account.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Go to Homepage' })).toBeVisible();
  });

  test('displays loading state and then error state upon failed verification', async ({ page }) => {
    // Intercept the API call and return an error
    await page.route('**/auth/verify-email', async route => {
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          statusCode: 400,
          message: 'Verification link is invalid or has expired.'
        })
      });
    });

    // Go to the page with a token
    await page.goto('/verify-email?token=invalid-token');

    // Should display loading state first
    await expect(page.getByText('Verifying Email...')).toBeVisible();

    // After response, should display error state
    await expect(page.getByText('Verification Failed')).toBeVisible();
    await expect(page.getByText('Verification link is invalid or has expired.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Return to Homepage' })).toBeVisible();
  });
});
