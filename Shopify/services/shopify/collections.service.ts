// Collections API service
import { shopifyClient } from '@/lib/shopify';
import {
  getCollectionsQuery,
  getProductsByCollectionQuery,
  getProductsByCollectionQueryWithoutMetafields,
} from './queries/collections.queries';
import { Collection } from '@/types/collection';
import { Product } from '@/types/product';

export interface CollectionInfo {
  id: string;
  title: string;
  handle: string;
}

export class CollectionsService {
  /**
   * Fetch all collections
   */
  async getCollections(first: number = 250): Promise<CollectionInfo[]> {
    try {
      const data = await shopifyClient.request<{
        collections: {
          edges: Array<{
            node: Collection;
          }>;
        };
      }>(getCollectionsQuery, {
        first,
      });

      return data.collections.edges.map((edge) => ({
        id: edge.node.id,
        title: edge.node.title,
        handle: edge.node.handle,
      }));
    } catch (error) {
      // Return empty array instead of throwing to prevent page crashes
      // This can happen if the access token doesn't have collection permissions
      return [];
    }
  }

  /**
   * Filter collections by keywords
   */
  filterCollectionsByKeywords(
    collections: CollectionInfo[],
    keywords: string[]
  ): CollectionInfo[] {
    return collections.filter((collection) => {
      const title = collection.title.toLowerCase();
      const handle = collection.handle.toLowerCase();

      return keywords.some(
        (keyword) => title.includes(keyword) || handle.includes(keyword)
      );
    });
  }

  /**
   * Get diamond collections (Natural and Lab Grown)
   */
  async getDiamondCollections(): Promise<CollectionInfo[]> {
    try {
      const allCollections = await this.getCollections();
      return this.filterCollectionsByKeywords(allCollections, [
        'natural',
        'diamond',
        'lab',
        'lab-grown',
      ]).filter((collection) => {
        const title = collection.title.toLowerCase();
        const handle = collection.handle.toLowerCase();
        return (
          (title.includes('natural') && title.includes('diamond')) ||
          (handle.includes('natural') && handle.includes('diamond')) ||
          (title.includes('lab') && title.includes('diamond')) ||
          (handle.includes('lab') && handle.includes('diamond'))
        );
      });
    } catch (error) {
      return [];
    }
  }

  /**
   * Get jewelry collections
   */
  async getJewelryCollections(): Promise<CollectionInfo[]> {
    try {
      const allCollections = await this.getCollections();
      const jewelryKeywords = [
        'jewelry',
        'jewellery',
        'ring',
        'necklace',
        'earring',
        'bracelet',
        'pendant',
        'charm',
      ];
      return this.filterCollectionsByKeywords(allCollections, jewelryKeywords);
    } catch (error) {
      return [];
    }
  }

  /**
   * Get products by collection handle (server-side)
   */
  async getProductsByCollection(
    collectionHandle: string,
    first: number = 250
  ): Promise<Product[]> {
    try {
      // Try with metafields first
      try {
        const data = await shopifyClient.request<{
          collection: {
            products: {
              edges: Array<{ node: Product }>;
            };
          } | null;
        }>(getProductsByCollectionQuery, {
          handle: collectionHandle,
          first,
        });

        if (!data.collection) {
          return [];
        }

        return data.collection.products.edges.map((edge) => edge.node);
      } catch (error) {
        // Fallback to query without metafields
        const data = await shopifyClient.request<{
          collection: {
            products: {
              edges: Array<{ node: Product }>;
            };
          } | null;
        }>(getProductsByCollectionQueryWithoutMetafields, {
          handle: collectionHandle,
          first,
        });

        if (!data.collection) {
          return [];
        }

        return data.collection.products.edges.map((edge) => edge.node);
      }
    } catch (error) {
      throw error;
    }
  }
}

// Export singleton instance
export const collectionsService = new CollectionsService();
