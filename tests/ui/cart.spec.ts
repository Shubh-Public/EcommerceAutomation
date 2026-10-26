import { expect, test } from '../../src/fixtures/test.ts';
import { knownProducts } from '../../src/data/catalogue.ts';
import { reportMetadata } from '../../src/reporting/report-metadata.ts';

const metadata = reportMetadata({ layer: 'ui', epic: 'Shopping', feature: 'Cart' });

test.describe('Cart', { annotation: metadata }, () => {
  test(
    'a guest sets a product quantity from the home page and sees that quantity in the cart',
    { annotation: reportMetadata({ severity: 'normal' }) },
    async ({ homePage, productDetailsPage, cartPage }) => {
      const product = knownProducts.blueTop;
      const quantity = 4;

      await homePage.goto();
      await expect(homePage.heading).toBeVisible();

      await homePage.openProductDetails(product.name);
      await expect(productDetailsPage.name).toHaveText(product.name);

      const modal = await productDetailsPage.addToCart(quantity);
      await modal.viewCart();

      await expect(cartPage.items.line(product.name).quantity).toHaveText(String(quantity));
    },
  );
});
