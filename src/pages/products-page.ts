import type { Locator, Page } from '@playwright/test';

/** /products: catalogue listing and product search. */
export class ProductsPage {
  readonly searchResultsHeading: Locator;
  /** Name of every product card currently listed. */
  readonly productNames: Locator;
  private readonly page: Page;
  private readonly cards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchResultsHeading = page.getByRole('heading', { name: 'Searched Products' });
    // Product cards have no roles or test ids; their layout classes are the only hooks.
    this.cards = page.locator('.features_items .product-image-wrapper');
    this.productNames = this.cards.locator('.productinfo p');
  }

  async goto(): Promise<void> {
    await this.page.goto('/products');
  }

  async search(term: string): Promise<void> {
    await this.page.getByPlaceholder('Search Product').fill(term);
    // Icon-only button with no accessible name.
    await this.page.locator('#submit_search').click();
    await this.searchResultsHeading.waitFor();
  }

  async openProductDetails(productName: string): Promise<void> {
    await this.card(productName).getByRole('link', { name: 'View Product' }).click();
  }

  private card(productName: string): Locator {
    return this.cards.filter({
      has: this.page.locator('.productinfo p').getByText(productName, { exact: true }),
    });
  }
}
