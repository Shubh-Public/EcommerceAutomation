import { expect, test } from '../../src/fixtures/test.ts';
import { formatPrice, knownProducts } from '../../src/data/catalogue.ts';
import { reportMetadata } from '../../src/reporting/report-metadata.ts';

const metadata = reportMetadata({ layer: 'ui', epic: 'Catalogue', feature: 'Product search' });

test.describe('Product discovery', { annotation: metadata }, () => {
  test(
    'search lists the same products as the search API and verify the product details information',
    {
      tag: '@smoke',
      annotation: reportMetadata({ severity: 'critical' }),
    },
    async ({ productsPage, productDetailsPage, api }) => {
      const term = 'top';
      const product = knownProducts.blueTop;
      // Search matches name OR category, so the backend result is the relevance oracle.
      const expectedNames = (await api.searchProducts(term)).map((p) => p.name);
      expect(expectedNames).toContain(product.name);
      await productsPage.goto();
      await productsPage.search(term);
      await expect(productsPage.productNames).toHaveText(expectedNames);

      await productsPage.openProductDetails(product.name);
      await expect(productDetailsPage.name).toHaveText(product.name);
      await expect(productDetailsPage.price).toHaveText(formatPrice(product.priceRupees));
      await expect(productDetailsPage.attribute('Availability')).toHaveText(
        `Availability: ${product.availability}`,
      );
    },
  );
});
