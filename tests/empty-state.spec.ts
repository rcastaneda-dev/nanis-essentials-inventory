import { test, expect, type Page } from '@playwright/test';

test.describe('Empty State Validations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display inventory empty state', async ({ page }) => {
    await expect(page.getByText('No items yet.')).toBeVisible();
    await expect(page.getByText('Showing 0 of 0 items')).toBeVisible();
  });

  test('should display purchases empty state', async ({ page }) => {
    await navigateToTab(page, 'Purchases');
    await expect(page.getByText('No purchases yet.')).toBeVisible();
  });

  test('should display sales empty state', async ({ page }) => {
    await navigateToTab(page, 'Sales');

    await Promise.all([
      expect(page.getByText('No sales found.')).toBeVisible(),
      expect(page.getByText('0 sales')).toBeVisible(),
      expect(page.getByText('0 customers')).toBeVisible(),
    ]);
  });

  test.describe('Transactions Tab', () => {
    test.beforeEach(async ({ page }) => {
      await navigateToTab(page, 'Transactions');
    });

    test('should display current month empty state', async ({ page }) => {
      await expect(page.getByText('No transactions found for current month.')).toBeVisible();
      await verifyCashWithdrawalsSection(page);
    });

    test('should display previous month empty state', async ({ page }) => {
      await page.getByRole('button', { name: 'Previous Month' }).click();

      await expect(page.getByText('No transactions found for previous month.')).toBeVisible();
      await verifyCashWithdrawalsSection(page);
    });

    test('should display overall empty state', async ({ page }) => {
      await page.getByRole('button', { name: 'Overall' }).click();

      await expect(
        page.getByText(
          'No transactions yet. Add business expenses, fees, income, discounts, and other transactions.'
        )
      ).toBeVisible();
      await verifyCashWithdrawalsSection(page);
    });
  });

  test('should display analytics empty state', async ({ page }) => {
    await navigateToTab(page, 'Analytics');

    await Promise.all([
      expect(page.getByText('No sales data yet')).toBeVisible(),
      expect(page.getByText('No sales with channels tracked yet')).toBeVisible(),
    ]);
  });
});

// Helper functions
async function navigateToTab(page: Page, tabName: string): Promise<void> {
  await page.getByRole('button', { name: tabName }).click();
}

async function verifyCashWithdrawalsSection(page: Page): Promise<void> {
  await Promise.all([
    expect(page.getByText('No Cash Withdrawals')).toBeVisible(),
    expect(
      page.getByText(
        'When you use business cash to fund purchases, the withdrawal history will appear here.'
      )
    ).toBeVisible(),
  ]);
}
