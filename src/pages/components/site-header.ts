import type { Locator, Page } from '@playwright/test';

/** Top navigation bar rendered on every page. */
export class SiteHeader {
  readonly loggedInBanner: Locator;
  private readonly root: Locator;

  constructor(page: Page) {
    // The nav has no landmark role or test id; `#header` is its only stable hook.
    this.root = page.locator('#header');
    this.loggedInBanner = this.root.getByRole('listitem').filter({ hasText: 'Logged in as' });
  }

  async openSignupLogin(): Promise<void> {
    await this.root.getByRole('link', { name: 'Signup / Login' }).click();
  }

  async openProducts(): Promise<void> {
    await this.root.getByRole('link', { name: 'Products' }).click();
  }

  async openCart(): Promise<void> {
    await this.root.getByRole('link', { name: 'Cart' }).click();
  }

  async logout(): Promise<void> {
    await this.root.getByRole('link', { name: 'Logout' }).click();
  }
}
