// Hook for fetching shop information and menus
import { useState, useCallback } from 'react';
import { apiClient } from '@/services/api-client';
import { Shop, Menu } from '@/types/shopify';

export interface UseShopReturn {
  shop: Shop | null;
  menu: Menu | null;
  loading: boolean;
  error: string | null;
  fetchShop: () => Promise<void>;
  fetchMenu: (handle: string) => Promise<void>;
}

export function useShop(): UseShopReturn {
  const [shop, setShop] = useState<Shop | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchShop = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<{ shop: Shop }>('/api/shop');

      if (response.error) {
        setError(response.error);
        setShop(null);
      } else if (response.data?.shop) {
        setShop(response.data.shop);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch shop information';
      setError(errorMessage);
      setShop(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMenu = useCallback(async (handle: string) => {
    if (!handle) {
      setMenu(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<{ menu: Menu | null }>(`/api/menu/${handle}`);

      if (response.error) {
        setError(response.error);
        setMenu(null);
      } else if (response.data) {
        setMenu(response.data.menu);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch menu';
      setError(errorMessage);
      setMenu(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    shop,
    menu,
    loading,
    error,
    fetchShop,
    fetchMenu,
  };
}

