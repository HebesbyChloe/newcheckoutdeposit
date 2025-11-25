// Hook for fetching products by collection handle
import { useState, useCallback } from 'react';
import { apiClient } from '@/services/api-client';
import { Product } from '@/types/product';

export interface UseCollectionProductsReturn {
  products: Product[];
  loading: boolean;
  error: string | null;
  fetchProducts: (collectionHandle: string, first?: number) => Promise<void>;
}

export function useCollectionProducts(): UseCollectionProductsReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async (collectionHandle: string, first: number = 250) => {
    if (!collectionHandle) {
      setProducts([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<{ products: Product[] }>(
        `/api/collections/${collectionHandle}/products?first=${first}`
      );

      if (response.error) {
        setError(response.error);
        setProducts([]);
      } else if (response.data?.products) {
        setProducts(response.data.products);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch collection products';
      setError(errorMessage);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    products,
    loading,
    error,
    fetchProducts,
  };
}

