// Diamond-specific filtering hook
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Product } from '@/types/product';
import { DiamondFilters } from '@/types/filter.types';
import { UseProductFiltersReturn } from '@/types/hook.types';
import { applyDiamondFilters } from '@/utils/filters/diamond-filters';

export function useDiamondFilters(
  products: Product[],
  initialFilters: DiamondFilters
): UseProductFiltersReturn<DiamondFilters> {
  const [filters, setFilters] = useState<DiamondFilters>(initialFilters);

  // Update filters when initialFilters change
  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const setFilter = useCallback((key: keyof DiamondFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const updateFilters = useCallback((newFilters: Partial<DiamondFilters>) => {
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
    return applyDiamondFilters(products, filters);
  }, [products, filters]);

  return {
    filters,
    setFilter,
    updateFilters,
    resetFilters,
    filteredProducts,
  };
}

