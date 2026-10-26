import type { Locator, Page } from '@playwright/test';

/** / : featured products and the site intro. */
export class HomePage {
  readonly heading: Locator;
  private readonly page: Page;
  private readonly cards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Features Items' });
    // Product cards have no roles or test ids; their layout classes are the only hooks.
    this.cards = page.locator('.features_items .product-image-wrapper');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.heading.waitFor();
  }

  async openProductDetails(productName: string): Promise<void> {
    await this.card(productName).getByRole('link', { name: 'View Product' }).click();
    await this.page.waitForURL('**/product_details/**');
  }

  private card(productName: string): Locator {
    return this.cards.filter({
      has: this.page.locator('.productinfo p').getByText(productName, { exact: true }),
    });
  }
}
