import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { InventoryManagementPage } from './pages/InventoryManagementPage';

test.describe('Login page', () => {
  test('should display error on invalid credentials', async ({ page, context }) => {
    // Mock auth API for deterministic, backend-independent test (Rule 6)
    await page.route('**/auth/v1/**', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'invalid_grant',
            error_description: 'Invalid login credentials',
          }),
        });
      } else {
        route.continue();
      }
    });

    // Block static assets for faster execution (Rule 5)
    await context.route('**/*.{png,jpg,jpeg,gif,webp,svg,woff2}', route => route.abort());

    const loginPage = new LoginPage(page);

    // Arrange: unauthenticated user sees login page at root
    await loginPage.navigate();

    // Act: submit with invalid credentials
    await loginPage.submitWithCredentials('invalid@example.com', 'wrongpassword');

    // Assert: error message displayed (web-first assertion, Rule 3)
    await expect(loginPage.errorMessage).toBeVisible();
  });

  test('should successfully log in with password', async ({ page }) => {
    const email = process.env.PLAYWRIGHT_TEST_EMAIL!;
    const password = process.env.PLAYWRIGHT_TEST_PASSWORD!;
    const loginPage = new LoginPage(page);
    const inventoryManagementPage = new InventoryManagementPage(page);
    await loginPage.navigate();
    await loginPage.submitWithCredentials(email, password);
    await expect(inventoryManagementPage.pageTitle).toBeVisible();
  });
});
