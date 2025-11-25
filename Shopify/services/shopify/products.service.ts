// Products API service
import { shopifyClient } from '@/lib/shopify';
import {
  getProductsQuery,
  getProductsQueryWithoutMetafields,
  getProductsByCollectionQuery,
  getProductQuery,
  getProductQueryWithoutMetafields,
  searchProductsQuery,
} from './queries/products.queries';
import { Product } from '@/types/product';
import { ProductApiResponse, ProductsApiResponse } from '@/types/api.types';

export class ProductsService {
  /**
   * Fetch all products
   */
  async getProducts(first: number = 250): Promise<Product[]> {
    try {
      // Try with metafields first
      const data = await shopifyClient.request<{
        products: {
          edges: Array<{
            node: Product;
          }>;
        };
      }>(getProductsQuery, {
        first,
      });

      // Clean up metafields: filter out null values (Shopify returns null for missing identifiers)
      const products = data.products.edges.map((edge) => {
        const node = edge.node;
        if (node.metafields && Array.isArray(node.metafields)) {
          node.metafields = node.metafields.filter(
            (m: { key?: string; value?: string; namespace?: string } | null | undefined) => 
              m !== null && m !== undefined
          );
        }
        return node;
      });

      // Safety check: if no products returned, try fallback
      if (products.length === 0) {
        return await this.getProductsFallback(first);
      }

      return products;
    } catch (error) {
      // Always try fallback - better to show products without metafields than no products at all
      return await this.getProductsFallback(first, error);
    }
  }

  /**
   * Fallback method to fetch products without metafields
   */
  private async getProductsFallback(
    first: number,
    originalError?: unknown
  ): Promise<Product[]> {
    const errorMessage =
      originalError instanceof Error
        ? originalError.message
        : String(originalError || 'Unknown error');
    try {
      const fallbackData = await shopifyClient.request<{
        products: {
          edges: Array<{
            node: Product;
          }>;
        };
      }>(getProductsQueryWithoutMetafields, {
        first,
      });

      const fallbackProducts = fallbackData.products.edges.map((edge) => edge.node);

      return fallbackProducts;
    } catch (fallbackError) {
      const fallbackErrorMessage =
        fallbackError instanceof Error
          ? fallbackError.message
          : String(fallbackError);
      // Still throw to show error, but log it clearly
      throw new Error(
        `Failed to fetch products. Original error: ${errorMessage}. Fallback error: ${fallbackErrorMessage}`
      );
    }
  }

  /**
   * Fetch product by handle
   */
  async getProductByHandle(handle: string): Promise<Product | null> {
    try {
      const data = await shopifyClient.request<{
        product: Product | null;
      }>(getProductQuery, {
        handle: handle.trim(),
      });

      if (!data.product) {
        return null;
      }

      // Clean up metafields: filter out null values (Shopify returns null for missing identifiers)
      if (data.product.metafields && Array.isArray(data.product.metafields)) {
        data.product.metafields = data.product.metafields.filter(
          (m: any) => m !== null && m !== undefined
        );
      }

      return data.product;
    } catch (error) {

      // Try fallback without metafields ONLY for metafield-specific errors
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const shouldTryFallback =
        errorMessage.includes('metafield') ||
        errorMessage.includes('metafields') ||
        errorMessage.includes('Cannot query field "metafields"');

      if (shouldTryFallback) {
        try {
          const fallbackData = await shopifyClient.request<{
            product: Product | null;
          }>(getProductQueryWithoutMetafields, {
            handle: handle.trim(),
          });

          return fallbackData.product;
        } catch (fallbackError) {
          // If fallback also fails, return null (product might not exist)
          return null;
        }
      }

      // For other errors (like network issues), return null
      return null;
    }
  }

  /**
   * Search products by query string
   */
  async searchProducts(query: string, first: number = 10): Promise<Product[]> {
    if (!query || !query.trim()) {
      return [];
    }

    try {
      const data = await shopifyClient.request<{
        products: {
          edges: Array<{
            node: Product;
          }>;
        };
      }>(searchProductsQuery, {
        query: query.trim(),
        first,
      });

      // Clean up metafields: filter out null values
      const products = data.products.edges.map((edge) => {
        const node = edge.node;
        if (node.metafields && Array.isArray(node.metafields)) {
          node.metafields = node.metafields.filter(
            (m: any) => m !== null && m !== undefined
          );
        }
        return node;
      });

      return products;
    } catch (error) {
      return [];
    }
  }

  /**
   * Fetch products by collection handle
   */
  async getProductsByCollection(collectionHandle: string, first: number = 250): Promise<Product[]> {
    // This would require a new query - for now, filter client-side
    const allProducts = await this.getProducts(first);
    return allProducts.filter((product) => {
      return product.collections?.edges?.some(
        (edge) => edge.node.handle === collectionHandle
      );
    });
  }

  /**
   * Fetch products by trying multiple collection handles
   * Useful for category pages that need fallback logic
   * @param handles - Array of collection handles to try
   * @param options - Options for fetching
   * @returns Array of products (deduplicated if options.deduplicate is true)
   */
  async getProductsByMultipleHandles(
    handles: string[],
    options: {
      first?: number;
      deduplicate?: boolean;
    } = {}
  ): Promise<Product[]> {
    const { first = 250, deduplicate = true } = options;
    const allProducts: Product[] = [];
    const seenProductIds = new Set<string>();

    for (const handle of handles) {
      try {
        const data = await shopifyClient.request<{
          collection: {
            products: {
              edges: Array<{
                node: Product;
              }>;
            };
          } | null;
        }>(getProductsByCollectionQuery, {
          handle: handle,
          first,
        });

        if (data.collection && data.collection.products.edges.length > 0) {
          // Add products, avoiding duplicates if enabled
          data.collection.products.edges.forEach((edge) => {
            if (deduplicate) {
              if (!seenProductIds.has(edge.node.id)) {
                seenProductIds.add(edge.node.id);
                allProducts.push(edge.node);
              }
            } else {
              allProducts.push(edge.node);
            }
          });
        }
      } catch (err) {
        // Try next handle - continue silently
        continue;
      }
    }

    if (allProducts.length === 0) {
      return [];
    } else {
      return allProducts;
    }
  }
}

// Export singleton instance
export const productsService = new ProductsService();
