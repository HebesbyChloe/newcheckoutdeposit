// External diamond filters hook for Typesense
// Builds filter_by strings instead of client-side filtering
import { useState, useEffect, useCallback } from 'react';
import { DiamondFilters } from '@/types/filter.types';
import { buildTypesenseFilter } from '@/utils/typesense/filter-builder';

export interface UseExternalDiamondFiltersReturn {
  filters: DiamondFilters;
  setFilter: (key: keyof DiamondFilters, value: any) => void;
  updateFilters: (newFilters: Partial<DiamondFilters>) => void;
  resetFilters: () => void;
  buildFilterBy: () => string | undefined;
}

export function useExternalDiamondFilters(
  initialFilters: DiamondFilters
): UseExternalDiamondFiltersReturn {
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

  // Build Typesense filter_by string from current filters
  const buildFilterBy = useCallback(() => {
    return buildTypesenseFilter(filters);
  }, [filters]);

  return {
    filters,
    setFilter,
    updateFilters,
    resetFilters,
    buildFilterBy,
  };
}
