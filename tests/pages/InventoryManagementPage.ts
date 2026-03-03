import { Page } from '@playwright/test';
import { Locator } from '@playwright/test';

export class InventoryManagementPage {
  readonly page: Page;
  readonly pageTitle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole('heading', { level: 2, name: 'Inventory Management' });
  }

  async navigate(): Promise<void> {
    await this.page.goto('/');
  }

  async getPageTitle(): Promise<Locator> {
    return this.pageTitle;
  }
}
