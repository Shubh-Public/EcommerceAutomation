import type { Locator, Page } from '@playwright/test';

export interface CartLine {
  readonly row: Locator;
  readonly price: Locator;
  readonly quantity: Locator;
  readonly total: Locator;
}

/** Line-item table rendered identically on /view_cart and /checkout. */
export class CartItemsTable {
  readonly productRows: Locator;
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
    this.productRows = page.locator('#cart_info tbody tr[id^="product-"]');
  }

  /** Cells of the row for `productName`. Cell classes are the only stable hooks. */
  line(productName: string): CartLine {
    // `has` is resolved relative to each row, so it must not be scoped to an ancestor.
    const row = this.productRows.filter({
      has: this.page.getByRole('link', { name: productName, exact: true }),
    });
    return {
      row,
      price: row.locator('.cart_price'),
      quantity: row.locator('.cart_quantity'),
      total: row.locator('.cart_total'),
    };
  }
}
