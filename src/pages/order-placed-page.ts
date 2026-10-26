import type { Locator, Page } from '@playwright/test';

/** /payment_done/:amount: order confirmation. */
export class OrderPlacedPage {
  readonly heading: Locator;
  readonly confirmation: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole('heading', { name: 'Order Placed!' });
    this.confirmation = page.getByText('Congratulations! Your order has been confirmed!');
  }
}
