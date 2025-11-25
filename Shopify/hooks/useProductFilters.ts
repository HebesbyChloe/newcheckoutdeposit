// Generic product filtering hook
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Product } from '@/types/product.types';
import { DiamondFilters, JewelryFilters } from '@/types/filter.types';
import { UseProductFiltersReturn } from '@/types/hook.types';
import { applyFilters } from '@/utils/filters/product-filters';

export function useProductFilters<T extends DiamondFilters | JewelryFilters>(
  products: Product[],
  initialFilters: T,
  filterFunction: (products: Product[], filters: T) => Product[]
): UseProductFiltersReturn<T> {
  const [filters, setFilters] = useState<T>(initialFilters);

  // Update filters when initialFilters change
  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const setFilter = useCallback((key: keyof T, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const updateFilters = useCallback((newFilters: Partial<T>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  // Memoize filtered products
  const filteredProducts = useMemo(() => {
    return filterFunction(products, filters);
  }, [products, filters, filterFunction]);

  return {
    filters,
    setFilter,
    updateFilters,
    resetFilters,
    filteredProducts,
  };
}

