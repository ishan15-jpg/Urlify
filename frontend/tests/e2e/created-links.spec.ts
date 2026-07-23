import { test, expect } from '@playwright/test';

test.describe('Created Links Page', () => {
  test.beforeEach(async ({ page }) => {
    // Inject auth token into localStorage to bypass authentication redirect if any
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('access-token', 'mock-token');
    });
  });

  test('displays skeleton loader while fetching and then shows links table', async ({ page }) => {
    // Intercept the /url/me endpoint and delay the response to test the skeleton
    await page.route('**/url/me*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Delay for 1s
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          statusCode: 200,
          message: 'Short URLs fetched successfully',
          data: {
            shortUrls: [
              {
                id: '1',
                shortCode: 'sd-prep',
                originalUrl: 'https://example.com/blog/system-design-interview-prep-guide',
                shortUrl: 'https://snip.io/sd-prep',
                isActive: true,
                createdAt: '2026-06-29T10:15:30.000Z',
                expiresAt: '2026-12-31T23:59:59.000Z'
              },
              {
                id: '2',
                shortCode: 'expired-link',
                originalUrl: 'https://example.com/old-campaign',
                shortUrl: 'https://snip.io/expired-link',
                isActive: true,
                createdAt: '2020-01-01T10:15:30.000Z',
                expiresAt: '2020-02-01T23:59:59.000Z' // Already expired
              }
            ],
            pagination: {
              totalItems: 2,
              currentPage: 1,
              totalPages: 1,
              limit: 20
            }
          },
          meta: {
            requestId: 'req_123',
            timestamp: '2026-01-01T00:00:00.000Z'
          }
        })
      });
    });

    // Go to the created links page
    await page.goto('/links');

    // Wait for the skeleton loader to appear
    const skeleton = page.locator('.animate-pulse');
    await expect(skeleton.first()).toBeVisible();

    // After 1 second, the skeleton should disappear
    await expect(skeleton.first()).not.toBeVisible({ timeout: 5000 });

    // Assert that the links are displayed in the table
    await expect(page.getByText('snip.io/sd-prep')).toBeVisible();
    await expect(page.getByText('snip.io/expired-link')).toBeVisible();

    // Check expiration logic
    // The second link should show 'Expired' because the expiry date is in the past
    await expect(page.getByText('Expired', { exact: true })).toBeVisible();
  });

  test('shows empty state when no links exist', async ({ page }) => {
    await page.route('**/url/me*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          statusCode: 200,
          message: 'Short URLs fetched successfully',
          data: {
            shortUrls: [],
            pagination: {
              totalItems: 0,
              currentPage: 1,
              totalPages: 1,
              limit: 20
            }
          },
          meta: {
            requestId: 'req_124',
            timestamp: '2026-01-01T00:00:00.000Z'
          }
        })
      });
    });

    await page.goto('/links');

    await expect(page.getByText('No links created yet')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Get Started' })).toBeVisible();
  });

  test('shows error state when API fails', async ({ page }) => {
    await page.route('**/url/me*', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          statusCode: 500,
          message: 'Internal Server Error'
        })
      });
    });

    await page.goto('/links');

    await expect(page.getByText('Error loading links')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('There was a problem fetching your links. Please try again later.')).toBeVisible();
  });
});
