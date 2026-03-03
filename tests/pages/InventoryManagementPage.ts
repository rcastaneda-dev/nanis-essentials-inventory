import type { Page, Locator } from '@playwright/test';

export class InventoryManagementPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly signOutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole('heading', {
      level: 2,
      name: /Inventory Management|Gestión de Inventario|Inventory|Inventario/,
    });
    this.signOutButton = page.getByTestId('sign-out-btn');
  }

  async navigate(): Promise<void> {
    await this.page.goto('/');
  }
}
