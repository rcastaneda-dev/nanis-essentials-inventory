import type { Page, Locator } from '@playwright/test';

/**
 * Page object for the login screen. Abstracts selectors and exposes intent-based actions.
 */
export class LoginPage {
  /** Locator for the email input field. */
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly toggleModeButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId('auth-email-input');
    this.passwordInput = page.getByTestId('auth-password-input');
    this.submitButton = page.getByTestId('auth-submit-btn');
    this.toggleModeButton = page.getByTestId('auth-toggle-mode');
    this.errorMessage = page.getByText(/Authentication failed|Error de autenticación/);
  }

  async navigate(): Promise<void> {
    await this.page.goto('/');
  }

  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  /** Submits the form with email and password (password mode). */
  async submitWithCredentials(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submitButton.click();
  }

  /** Switches between password and magic link modes. */
  async toggleAuthMode(): Promise<void> {
    await this.toggleModeButton.click();
  }
}
