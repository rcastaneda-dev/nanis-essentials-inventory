import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

const test = base.extend<{
  loginPage: LoginPage;
}>({
  loginPage: [
    async ({ page }, use) => {
      await use(new LoginPage(page));
    },
    { auto: true },
  ],
});

export { test, expect };
