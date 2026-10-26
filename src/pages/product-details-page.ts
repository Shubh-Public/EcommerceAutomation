import type { Locator, Page } from '@playwright/test';
import { AddedToCartModal } from './components/added-to-cart-modal.ts';

export type ProductAttribute = 'Category' | 'Availability' | 'Condition' | 'Brand';

/** /product_details/:id */
export class ProductDetailsPage {
  readonly name: Locator;
  readonly price: Locator;
  readonly addedToCartModal: AddedToCartModal;
  private readonly page: Page;
  private readonly info: Locator;

  constructor(page: Page) {
    this.page = page;
    this.info = page.locator('.product-information');
    this.name = this.info.getByRole('heading', { level: 2 });
    this.price = this.info.locator(':scope > span > span');
    this.addedToCartModal = new AddedToCartModal(page);
  }

  async goto(productId: number): Promise<void> {
    await this.page.goto(`/product_details/${productId}`);
  }

  /** Paragraph rendered as "<Label>: <value>", e.g. "Brand: Polo". */
  attribute(label: ProductAttribute): Locator {
    return this.info.locator('p').filter({ hasText: new RegExp(`^\\s*${label}:`) });
  }

  /** Sets the quantity, adds to cart and waits for the confirmation dialog. */
  async addToCart(quantity = 1): Promise<AddedToCartModal> {
    // cart.js binds `.cart` at the end of <body>. The button is visible before that.
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.locator('#quantity').fill(String(quantity));
    await this.info.getByRole('button', { name: 'Add to cart' }).click();
    await this.addedToCartModal.waitUntilOpen();
    return this.addedToCartModal;
  }
}
