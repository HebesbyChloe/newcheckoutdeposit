// Hook for searching products
import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '@/services/api-client';
import { Product } from '@/types/product';

export interface UseSearchReturn {
  results: Product[];
  loading: boolean;
  error: string | null;
  search: (query: string, first?: number) => Promise<void>;
  clearResults: () => void;
}

export function useSearch(): UseSearchReturn {
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, first: number = 10) => {
    if (!query || !query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<{ products: Product[] }>(
        `/api/search?q=${encodeURIComponent(query.trim())}&first=${first}`
      );

      if (response.error) {
        setError(response.error);
        setResults([]);
      } else if (response.data?.products) {
        setResults(response.data.products);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search products';
      setError(errorMessage);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    loading,
    error,
    search,
    clearResults,
  };
}

