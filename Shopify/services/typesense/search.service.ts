
// Typesense search service
import { TypesenseSearchParams, TypesenseSearchResponse } from '@/types/typesense.types';
import { apiClient } from '@/services/api-client';

export class TypesenseSearchService {
  /**
   * Search products from Typesense external feed
   * @param params Search parameters
   * @param collection Collection to search: 'natural' or 'labgrown' (default: 'natural')
   */
  async searchProducts(params: TypesenseSearchParams, collection: 'natural' | 'labgrown' = 'natural'): Promise<TypesenseSearchResponse> {
    try {
      // Build query string
      const queryParams = new URLSearchParams();
      
      // Add collection parameter
      queryParams.set('collection', collection);
      
      if (params.q) queryParams.set('q', params.q);
      if (params.query_by) queryParams.set('query_by', params.query_by);
      if (params.per_page) queryParams.set('per_page', String(params.per_page));
      if (params.page) queryParams.set('page', String(params.page));
      if (params.sort_by) queryParams.set('sort_by', params.sort_by);
      if (params.filter_by) {
        // filter_by may contain special characters, ensure proper encoding
        queryParams.set('filter_by', params.filter_by);
      }

      const queryString = queryParams.toString();
      const url = `/api/external-feed/products${queryString ? `?${queryString}` : ''}`;

      const response = await apiClient.get<TypesenseSearchResponse>(url);

      if (response.error) {
        // Preserve detailed error information
        const errorDetails = response.details || {};
        const errorMessage = response.message || response.error || 'Unknown error';
        const enhancedError = new Error(errorMessage);
        (enhancedError as any).details = {
          ...errorDetails,
          error: response.error,
          message: response.message,
          url,
          collection,
        };
        throw enhancedError;
      }

      if (!response.data) {
        throw new Error('No data returned from Typesense');
      }

      return response.data;
    } catch (error) {
      console.error('Error searching Typesense products:', error);
      if (error instanceof Error && (error as any).details) {
        console.error('Error details:', (error as any).details);
      }
      throw error;
    }
  }

  /**
   * Get a single product by itemId from Typesense external feed
   * @param itemId The item ID to fetch
   * @param collection Collection to search: 'natural' or 'labgrown' (default: 'natural')
   */
  async getProductByItemId(itemId: string, collection: 'natural' | 'labgrown' = 'natural'): Promise<TypesenseSearchResponse> {
    try {
      // Determine base URL for server-side requests
      const baseUrl = typeof window === 'undefined' 
        ? process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3009'
        : '';
      
      const url = `${baseUrl}/api/external-feed/products/${itemId}?collection=${collection}`;
      
      const response = await apiClient.get<TypesenseSearchResponse>(url);

      if (response.error) {
        console.error('❌ API Client returned error:', response.error);
        // Preserve detailed error information
        const errorDetails = response.details || {};
        const errorMessage = response.message || response.error || 'Unknown error';
        const enhancedError = new Error(errorMessage);
        (enhancedError as any).details = {
          ...errorDetails,
          error: response.error,
          message: response.message,
          url,
          itemId,
          collection,
        };
        throw enhancedError;
      }

      if (!response.data) {
        console.error('❌ API Client returned no data');
        throw new Error('No data returned from Typesense');
      }

      return response.data;
    } catch (error) {
      console.error('❌ Error fetching diamond by itemId:', error);
      if (error instanceof Error) {
        console.error('Error stack:', error.stack);
        if ((error as any).details) {
          console.error('Error details:', (error as any).details);
        }
      }
      throw error;
    }
  }

  /**
   * Build filter_by string from filter object
   * This is a convenience method that delegates to the filter builder utility
   */
  buildFilterBy(filters: any): string | undefined {
    // This will be implemented by the filter builder utility
    // Imported here to keep the service clean
    return undefined;
  }
}

// Export singleton instance
export const typesenseSearchService = new TypesenseSearchService();
