import type { Locator, Page } from '@playwright/test';

/** /account_created: confirmation shown after a successful registration. */
export class AccountCreatedPage {
  readonly heading: Locator;
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Account Created!' });
  }

  async continue(): Promise<void> {
    await this.page.getByTestId('continue-button').click();
  }
}
