// Hook return types

import { Product } from './product';
import { Cart } from './api.types';

export interface AddToCartInput {
  source: 'shopify' | 'external';
  variantId?: string;
  externalId?: string;
  title: string;
  imageUrl: string;
  price: { amount: string; currencyCode: string };
  quantity?: number;
  attributes?: Array<{ key: string; value: string }>;
  productHandle?: string;
  payload?: Record<string, any>;
}
import { DiamondFilters, JewelryFilters } from './filter.types';

export interface UseCartReturn {
  cart: Cart | null;
  addToCart: (input: AddToCartInput) => Promise<void>;
  updateQuantity: (lineId: string, quantity: number) => Promise<void>;
  removeItem: (lineId: string) => Promise<void>;
  applyDiscount: (code: string) => Promise<void>;
  removeDiscount: () => Promise<void>;
  clearCart: () => Promise<void>;
  getCart: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

export interface UseProductFiltersReturn<T extends DiamondFilters | JewelryFilters> {
  filters: T;
  setFilter: (key: keyof T, value: any) => void;
  updateFilters: (newFilters: Partial<T>) => void;
  resetFilters: () => void;
  filteredProducts: Product[];
}

export interface UseViewModeReturn {
  viewMode: 'grid' | 'table';
  setViewMode: (mode: 'grid' | 'table') => void;
  toggleViewMode: () => void;
}

export interface UseModalReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export interface UseShopReturn {
  shop: any | null;
  menu: any | null;
  loading: boolean;
  error: string | null;
  fetchShop: () => Promise<void>;
  fetchMenu: (handle: string) => Promise<void>;
}

export interface UseRecommendationsReturn {
  recommendations: Product[];
  loading: boolean;
  error: string | null;
  fetchRecommendations: (productId: string) => Promise<void>;
}

export interface UseCollectionProductsReturn {
  products: Product[];
  loading: boolean;
  error: string | null;
  fetchProducts: (collectionHandle: string, first?: number) => Promise<void>;
}

export interface UseSearchReturn {
  results: Product[];
  loading: boolean;
  error: string | null;
  search: (query: string, first?: number) => Promise<void>;
  clearResults: () => void;
}
