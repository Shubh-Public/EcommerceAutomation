import { expect, test } from '../../src/fixtures/test.ts';
import { formatPrice, knownProducts } from '../../src/data/catalogue.ts';
import { reportMetadata } from '../../src/reporting/report-metadata.ts';

const metadata = reportMetadata({ layer: 'api', epic: 'Catalogue', feature: 'Products API' });

test.describe('Products API', { annotation: metadata }, () => {
  test(
    'GET /api/productsList returns a well-formed catalogue',
    {
      tag: '@smoke',
      annotation: reportMetadata({ severity: 'critical' }),
    },
    async ({ api }) => {
      const products = await api.listProducts();

      expect(products.length).toBeGreaterThan(0);
      const ids = products.map((p) => p.id);
      expect(new Set(ids).size, 'product ids must be unique').toBe(ids.length);
      for (const product of products) {
        expect(product.name.trim(), `name of product ${product.id}`).not.toBe('');
        expect(product.price, `price of product ${product.id}`).toMatch(/^Rs\. \d+$/);
      }

      const blueTop = knownProducts.blueTop;
      expect(products).toContainEqual({
        id: blueTop.id,
        name: blueTop.name,
        price: formatPrice(blueTop.priceRupees),
        brand: blueTop.brand,
        category: { usertype: 'Women', category: 'Tops' },
      });
    },
  );

  test(
    'POST /api/searchProduct returns only products matching the term by name or category',
    {
      annotation: reportMetadata({ severity: 'normal' }),
    },
    async ({ api }) => {
      const term = 'jean';
      const results = await api.searchProducts(term);

      expect(results.length).toBeGreaterThan(0);
      for (const product of results) {
        const searchable = `${product.name} ${product.category.category}`.toLowerCase();
        expect(searchable, `product ${product.id} should match "${term}"`).toContain(term);
      }
    },
  );

  test(
    'POST /api/searchProduct without a search term is rejected as a bad request',
    {
      annotation: reportMetadata({ severity: 'minor' }),
    },
    async ({ api }) => {
      const response = await api.searchProductsWithoutTerm();

      expect(response).toEqual({
        responseCode: 400,
        message: 'Bad request, search_product parameter is missing in POST request.',
      });
    },
  );
});
