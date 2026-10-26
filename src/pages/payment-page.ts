import type { Locator, Page } from '@playwright/test';
import type { PaymentCard } from '../data/payment-card.ts';

/** /payment: card form. Submitting navigates to /payment_done/:amount. */
export class PaymentPage {
  readonly heading: Locator;
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Payment' });
  }

  async payAndConfirm(card: PaymentCard): Promise<void> {
    await this.page.getByTestId('name-on-card').fill(card.nameOnCard);
    await this.page.getByTestId('card-number').fill(card.number);
    await this.page.getByTestId('cvc').fill(card.cvc);
    await this.page.getByTestId('expiry-month').fill(card.expiryMonth);
    await this.page.getByTestId('expiry-year').fill(card.expiryYear);
    await this.page.getByTestId('pay-button').click();
  }
}
