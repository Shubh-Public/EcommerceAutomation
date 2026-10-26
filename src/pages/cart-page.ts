import type { Page } from '@playwright/test';
import { CartItemsTable } from './components/cart-items-table.ts';

/** /view_cart */
export class CartPage {
  readonly items: CartItemsTable;
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
    this.items = new CartItemsTable(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/view_cart');
  }

  /** Logged-in shoppers only; guests get a "Checkout" login prompt instead. */
  async proceedToCheckout(): Promise<void> {
    // The button is an <a> without href whose click handler is bound by an
    // inline script at the end of <body>. It is visible before that script
    // runs, so wait for DOMContentLoaded or the click is silently lost.
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.getByText('Proceed To Checkout', { exact: true }).click();
    await this.page.waitForURL('**/checkout');
  }
}
