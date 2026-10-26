/**
 * Facts about the public site's static seed catalogue, verified against
 * GET /api/productsList and /product_details/1. If the site changes its seed
 * data, update this file rather than individual specs.
 */
export const knownProducts = {
  blueTop: {
    id: 1,
    name: 'Blue Top',
    priceRupees: 500,
    category: 'Women > Tops',
    brand: 'Polo',
    availability: 'In Stock',
    condition: 'New',
  },
} as const;

export type KnownProduct = (typeof knownProducts)[keyof typeof knownProducts];

/** Formats a rupee amount the way the site renders prices, e.g. "Rs. 500". */
export function formatPrice(rupees: number): string {
  return `Rs. ${rupees}`;
}
