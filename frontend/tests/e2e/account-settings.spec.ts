import { test, expect } from '@playwright/test';

test.describe('Account Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    // Inject auth token into localStorage to bypass authentication redirect if any
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'mock-token');
    });
  });

  test('displays skeleton loader while fetching and then shows user profile', async ({ page }) => {
    // Intercept the /users/me endpoint and delay the response to test the skeleton
    await page.route('**/users/me', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Delay for 1s
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          statusCode: 200,
          message: 'User profile fetched successfully',
          data: {
            user: {
              id: '123',
              email: 'test@example.com',
              name: 'Test User',
              role: 'USER',
              isEmailVerified: true,
              createdAt: '2026-01-01T00:00:00.000Z'
            }
          },
          meta: {
            requestId: 'req_123',
            timestamp: '2026-01-01T00:00:00.000Z'
          }
        })
      });
    });

    // Go to the account settings page
    await page.goto('/account-settings');

    // Wait for the skeleton loader to appear
    const skeleton = page.locator('.animate-pulse');
    await expect(skeleton).toBeVisible();

    // After 1 second, the skeleton should disappear and the form fields should be populated
    await expect(skeleton).not.toBeVisible({ timeout: 5000 });

    // Assert that the fields have the fetched data
    await expect(page.locator('#fullName')).toHaveValue('Test User');
    await expect(page.locator('#email')).toHaveValue('test@example.com');
    
    // Check that the "Unverified" text is NOT visible since isEmailVerified is true
    await expect(page.getByText('Unverified')).not.toBeVisible();
  });
});
