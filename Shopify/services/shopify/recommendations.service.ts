// Recommendations API service
import { shopifyClient } from '@/lib/shopify';
import { productRecommendationsQuery } from './queries/recommendations.queries';
import { Product } from '@/types/product';

export class RecommendationsService {
  /**
   * Get product recommendations
   */
  async getProductRecommendations(productId: string): Promise<Product[]> {
    try {
      const data = await shopifyClient.request<{
        productRecommendations: Product[];
      }>(productRecommendationsQuery, {
        productId,
      });

      return data.productRecommendations || [];
    } catch (error) {
      throw error;
    }
  }
}

// Export singleton instance
export const recommendationsService = new RecommendationsService();
