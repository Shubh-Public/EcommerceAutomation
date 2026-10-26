import type { Locator, Page } from '@playwright/test';

/** Bootstrap "Added!" dialog shown after any "Add to cart" click. */
export class AddedToCartModal {
  readonly title: Locator;
  private readonly root: Locator;

  constructor(page: Page) {
    this.root = page.locator('#cartModal');
    this.title = this.root.getByRole('heading', { name: 'Added!' });
  }

  /** The dialog fades in; wait before interacting so clicks are not lost. */
  async waitUntilOpen(): Promise<void> {
    await this.title.waitFor({ state: 'visible' });
  }

  async viewCart(): Promise<void> {
    await this.root.getByRole('link', { name: 'View Cart' }).click();
  }

  async continueShopping(): Promise<void> {
    await this.root.getByRole('button', { name: 'Continue Shopping' }).click();
    await this.root.waitFor({ state: 'hidden' });
  }
}
