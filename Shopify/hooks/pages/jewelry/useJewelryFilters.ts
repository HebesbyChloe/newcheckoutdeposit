// Jewelry-specific filtering hook
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Product } from '@/types/product';
import { JewelryFilters } from '@/types/filter.types';
import { UseProductFiltersReturn } from '@/types/hook.types';
import { applyJewelryFilters } from '@/utils/filters/jewelry-filters';

export function useJewelryFilters(
  products: Product[]
): UseProductFiltersReturn<JewelryFilters> {
  const initialFilters: JewelryFilters = useMemo(() => ({
    collection: '',
    category: '',
    material: '',
    minPrice: 0,
    maxPrice: 10000000,
    style: '',
  }), []);
  const [filters, setFilters] = useState<JewelryFilters>(initialFilters);

  // Update filters when initialFilters change
  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const setFilter = useCallback((key: keyof JewelryFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const updateFilters = useCallback((newFilters: Partial<JewelryFilters>) => {
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
    return applyJewelryFilters(products, filters);
  }, [products, filters]);

  return {
    filters,
    setFilter,
    updateFilters,
    resetFilters,
    filteredProducts,
  };
}

