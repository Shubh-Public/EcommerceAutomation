import { expect, test } from '../../src/fixtures/test.ts';
import { formatPrice, knownProducts } from '../../src/data/catalogue.ts';
import { buildTestCard } from '../../src/data/payment-card.ts';
import { reportMetadata } from '../../src/reporting/report-metadata.ts';

const metadata = reportMetadata({ layer: 'ui', epic: 'Shopping', feature: 'Checkout' });

test.describe('Checkout', { annotation: metadata }, () => {
  test(
    'a logged-in shopper buys a product and receives an order confirmation',
    {
      tag: '@smoke',
      annotation: reportMetadata({ severity: 'blocker' }),
    },
    async ({
      page,
      loginPage,
      header,
      productDetailsPage,
      cartPage,
      checkoutPage,
      paymentPage,
      orderPlacedPage,
      registeredUser,
    }) => {
      const product = knownProducts.blueTop;
      const quantity = 2;
      const expectedTotal = formatPrice(product.priceRupees * quantity);

      await test.step('log in as a freshly registered shopper', async () => {
        await loginPage.goto();
        await loginPage.login(registeredUser);
        await expect(header.loggedInBanner).toHaveText(`Logged in as ${registeredUser.name}`);
      });

      await test.step(`add ${quantity} x ${product.name} to the cart`, async () => {
        await productDetailsPage.goto(product.id);
        const modal = await productDetailsPage.addToCart(quantity);
        await modal.viewCart();
      });

      await test.step('cart contains exactly the expected line', async () => {
        await expect(cartPage.items.productRows).toHaveCount(1);
        const line = cartPage.items.line(product.name);
        await expect(line.quantity).toHaveText(String(quantity));
        await expect(line.price).toHaveText(formatPrice(product.priceRupees));
        await expect(line.total).toHaveText(expectedTotal);
      });

      await test.step('checkout shows the shopper address and the same order', async () => {
        await cartPage.proceedToCheckout();
        const { address } = registeredUser;
        await expect(checkoutPage.deliveryAddress).toContainText(address.address1);
        await expect(checkoutPage.deliveryAddress).toContainText(
          `${address.city} ${address.state} ${address.zipcode}`,
        );
        await expect(checkoutPage.items.line(product.name).total).toHaveText(expectedTotal);
      });

      await test.step('pay and confirm the order', async () => {
        await checkoutPage.placeOrder('Automated test order - please ignore.');
        await expect(paymentPage.heading).toBeVisible();
        await paymentPage.payAndConfirm(buildTestCard(registeredUser.name));

        await expect(orderPlacedPage.heading).toBeVisible();
        await expect(orderPlacedPage.confirmation).toBeVisible();
        // The confirmation URL carries the charged amount, e.g. /payment_done/1000.
        await expect(page).toHaveURL(
          new RegExp(`/payment_done/${product.priceRupees * quantity}$`),
        );
      });
    },
  );
});
