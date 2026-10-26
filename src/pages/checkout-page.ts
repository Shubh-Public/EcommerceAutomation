import type { Locator, Page } from '@playwright/test';
import { CartItemsTable } from './components/cart-items-table.ts';

/** /checkout: address review and order review. Requires a logged-in user. */
export class CheckoutPage {
  readonly deliveryAddress: Locator;
  readonly billingAddress: Locator;
  readonly items: CartItemsTable;
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
    this.deliveryAddress = page.locator('#address_delivery');
    this.billingAddress = page.locator('#address_invoice');
    this.items = new CartItemsTable(page);
  }

  async placeOrder(comment?: string): Promise<void> {
    if (comment !== undefined) {
      await this.page.locator('textarea[name="message"]').fill(comment);
    }
    await this.page.getByRole('link', { name: 'Place Order' }).click();
  }
}
