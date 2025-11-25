// Hook for fetching product recommendations
import { useState, useCallback } from 'react';
import { apiClient } from '@/services/api-client';
import { Product } from '@/types/product';

export interface UseRecommendationsReturn {
  recommendations: Product[];
  loading: boolean;
  error: string | null;
  fetchRecommendations: (productId: string) => Promise<void>;
}

export function useRecommendations(): UseRecommendationsReturn {
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async (productId: string) => {
    if (!productId) {
      setRecommendations([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<{ recommendations: Product[] }>(
        `/api/recommendations/${productId}`
      );

      if (response.error) {
        setError(response.error);
        setRecommendations([]);
      } else if (response.data?.recommendations) {
        setRecommendations(response.data.recommendations);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch recommendations';
      setError(errorMessage);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    recommendations,
    loading,
    error,
    fetchRecommendations,
  };
}

