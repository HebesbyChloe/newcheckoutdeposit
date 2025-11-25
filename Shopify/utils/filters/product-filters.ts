// Generic product filtering utilities
import { Product } from '@/types/product';

/**
 * Filter products by collection
 */
export function filterByCollection(
  products: Product[],
  collectionId: string
): Product[] {
  if (!collectionId) return products;

  return products.filter((product) => {
    if (!product.collections?.edges) return false;

    return product.collections.edges.some((edge) => {
      // Match by collection ID (most reliable)
      if (edge.node.id === collectionId) return true;

      // Match by handle
      if (edge.node.handle === collectionId) return true;

      // Match by title (case-insensitive)
      if (edge.node.title.toLowerCase() === collectionId.toLowerCase()) return true;

      return false;
    });
  });
}

/**
 * Filter products by price range
 */
export function filterByPriceRange(
  products: Product[],
  minPrice: number,
  maxPrice: number,
  defaultMin: number = 0,
  defaultMax: number = 10000000
): Product[] {
  // Only apply filter if user has changed from defaults
  if (minPrice === defaultMin && maxPrice === defaultMax) {
    return products;
  }

  return products.filter((product) => {
    const price = parseFloat(product.priceRange?.minVariantPrice?.amount || '0');
    return price >= minPrice && price <= maxPrice;
  });
}


