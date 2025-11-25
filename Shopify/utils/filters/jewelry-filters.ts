// Jewelry-specific filtering utilities
import { Product } from '@/types/product';
import { JewelryFilters } from '@/types/filter.types';
import { filterByCollection, filterByPriceRange } from './product-filters';

/**
 * Filter jewelry by category
 */
export function filterByCategory(products: Product[], category: string): Product[] {
  if (!category) return products;

  const categoryLower = category.toLowerCase();

  return products.filter((product) => {
    const title = product.title.toLowerCase();
    const description = product.description?.toLowerCase() || '';

    // Check if category appears in title or description
    if (title.includes(categoryLower) || description.includes(categoryLower)) {
      return true;
    }

    // Check if product is in a collection matching the category
    if (product.collections?.edges) {
      return product.collections.edges.some((edge) => {
        const collectionTitle = edge.node.title.toLowerCase();
        const collectionHandle = edge.node.handle.toLowerCase();
        return (
          collectionTitle.includes(categoryLower) ||
          collectionHandle.includes(categoryLower)
        );
      });
    }

    return false;
  });
}

/**
 * Filter jewelry by material
 */
export function filterByMaterial(products: Product[], material: string): Product[] {
  if (!material) return products;

  const materialLower = material.toLowerCase();

  return products.filter((product) => {
    const title = product.title.toLowerCase();
    const description = product.description?.toLowerCase() || '';

    // Check if material appears in title or description
    if (title.includes(materialLower) || description.includes(materialLower)) {
      return true;
    }

    // Check metafields if available
    if (product.metafields) {
      if (Array.isArray(product.metafields)) {
        return product.metafields.some((m) => {
          const value = m.value?.toLowerCase() || '';
          return value.includes(materialLower);
        });
      } else if ('edges' in product.metafields && product.metafields.edges) {
        return product.metafields.edges.some((edge) => {
          const value = edge.node.value?.toLowerCase() || '';
          return value.includes(materialLower);
        });
      }
    }

    return false;
  });
}

/**
 * Filter jewelry by style
 */
export function filterByStyle(products: Product[], style: string): Product[] {
  if (!style) return products;

  const styleLower = style.toLowerCase();

  return products.filter((product) => {
    const title = product.title.toLowerCase();
    const description = product.description?.toLowerCase() || '';

    // Check if style appears in title or description
    if (title.includes(styleLower) || description.includes(styleLower)) {
      return true;
    }

    // Check metafields if available
    if (product.metafields) {
      if (Array.isArray(product.metafields)) {
        return product.metafields.some((m) => {
          const value = m.value?.toLowerCase() || '';
          return value.includes(styleLower);
        });
      } else if ('edges' in product.metafields && product.metafields.edges) {
        return product.metafields.edges.some((edge) => {
          const value = edge.node.value?.toLowerCase() || '';
          return value.includes(styleLower);
        });
      }
    }

    return false;
  });
}

/**
 * Apply all jewelry filters
 */
export function applyJewelryFilters(
  products: Product[],
  filters: JewelryFilters
): Product[] {
  let filtered = [...products];

  // Apply filters in order
  if (filters.collection) {
    filtered = filterByCollection(filtered, filters.collection);
  }

  if (filters.category) {
    filtered = filterByCategory(filtered, filters.category);
  }

  if (filters.material) {
    filtered = filterByMaterial(filtered, filters.material);
  }

  if (filters.minPrice !== 0 || filters.maxPrice !== 10000000) {
    filtered = filterByPriceRange(
      filtered,
      filters.minPrice,
      filters.maxPrice
    );
  }

  if (filters.style) {
    filtered = filterByStyle(filtered, filters.style);
  }

  return filtered;
}

