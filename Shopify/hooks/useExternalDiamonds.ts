// Hook for fetching external diamonds from Typesense using React Query
import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Product } from '@/types/product';
import { DiamondFilters } from '@/types/filter.types';
import { typesenseSearchService } from '@/services/typesense/search.service';
import { transformTypesenseHitsToProducts } from '@/utils/typesense/response-transformer';
import { buildTypesenseFilter } from '@/utils/typesense/filter-builder';

export interface ErrorDetails {
  message?: string;
  status?: number;
  statusText?: string;
  url?: string;
  collection?: string;
  gatewayResponse?: any;
  [key: string]: any;
}

export interface UseExternalDiamondsReturn {
  products: Product[];
  loading: boolean;
  isFetching: boolean;
  error: string | null;
  errorDetails: ErrorDetails | null;
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  collection: 'natural' | 'labgrown';
  setCollection: (collection: 'natural' | 'labgrown') => void;
  setPage: (page: number) => void;
  setPerPage: (perPage: number) => void;
  refetch: () => void;
}

interface SearchParams {
  query: string;
  filters: DiamondFilters;
  page: number;
  perPage: number;
  collection: 'natural' | 'labgrown';
}

// Fetch function for React Query
async function fetchDiamonds(params: SearchParams): Promise<{
  products: Product[];
  total: number;
  page: number;
}> {
  const { query, filters, page, perPage, collection } = params;
  
  // Build filter_by string
  const filterBy = buildTypesenseFilter(filters);
  
  // Call Typesense service with collection
  const response = await typesenseSearchService.searchProducts({
    q: query || '*',
    query_by: 'title,description',
    per_page: perPage,
    page: page,
    sort_by: 'updated_at:desc',
    filter_by: filterBy,
  }, collection);
  
  // Transform hits to products
  const transformedProducts = transformTypesenseHitsToProducts(response.hits);
  
  return {
    products: transformedProducts,
    total: response.total,
    page: response.page,
  };
}

export function useExternalDiamonds(
  initialQuery: string = '*',
  initialFilters: DiamondFilters,
  initialPage: number = 1,
  initialPerPage: number = 10,
  initialCollection: 'natural' | 'labgrown' = 'natural'
): UseExternalDiamondsReturn {
  // Memoize search params to prevent unnecessary re-renders
  const [query, setQuery] = React.useState(initialQuery === '*' ? '' : initialQuery);
  const [filters, setFilters] = React.useState(initialFilters);
  const [page, setPageState] = React.useState(initialPage);
  const [perPage, setPerPageState] = React.useState(initialPerPage);
  const [collection, setCollectionState] = React.useState<'natural' | 'labgrown'>(initialCollection);

  // Memoize search params object to prevent query key changes
  const searchParams = useMemo<SearchParams>(() => ({
    query: query.trim() || '*',
    filters,
    page,
    perPage,
    collection,
  }), [query, filters, page, perPage, collection]);

  // React Query with keepPreviousData to prevent flicker
  const {
    data,
    isLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['external-diamonds', searchParams],
    queryFn: () => fetchDiamonds(searchParams),
    placeholderData: keepPreviousData, // Prevent flicker during loading
    staleTime: 1000 * 60 * 2, // 2 minutes - data is fresh for 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes - cache for 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });

  // Extract error details from query error
  const errorDetails = useMemo<ErrorDetails | null>(() => {
    if (!queryError) return null;
    
    const error = queryError as any;
    return {
      message: error.message || 'Failed to search diamonds',
      status: error.status,
      statusText: error.statusText,
      url: error.url,
      collection: searchParams.collection,
      gatewayResponse: error.gatewayResponse || error.response,
      ...error.details,
    };
  }, [queryError, searchParams.collection]);

  // Calculate derived values
  const products = data?.products || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / perPage);

  // Set collection and reset to page 1
  const setCollection = useCallback((newCollection: 'natural' | 'labgrown') => {
    setCollectionState(newCollection);
    setPageState(1);
  }, []);

  // Set page
  const setPage = useCallback((newPage: number) => {
    setPageState(newPage);
  }, []);

  // Set per page and reset to page 1
  const setPerPage = useCallback((newPerPage: number) => {
    setPerPageState(newPerPage);
    setPageState(1);
  }, []);

  return {
    products,
    loading: isLoading,
    isFetching,
    error: queryError ? (errorDetails?.message || 'Failed to search diamonds') : null,
    errorDetails,
    total,
    page,
    perPage,
    totalPages,
    collection,
    setCollection,
    setPage,
    setPerPage,
    refetch: () => {
      refetch();
    },
  };
}

// Export functions to update query and filters (for debouncing)
export function useExternalDiamondsWithDebounce(
  initialQuery: string = '*',
  initialFilters: DiamondFilters,
  initialPage: number = 1,
  initialPerPage: number = 10,
  initialCollection: 'natural' | 'labgrown' = 'natural'
) {
  const [debouncedQuery, setDebouncedQuery] = React.useState(initialQuery === '*' ? '' : initialQuery);
  const [debouncedFilters, setDebouncedFilters] = React.useState(initialFilters);
  const queryDebounceRef = React.useRef<NodeJS.Timeout | null>(null);
  const filtersDebounceRef = React.useRef<NodeJS.Timeout | null>(null);

  // Debounce query updates (300ms)
  const setQuery = useCallback((newQuery: string) => {
    if (queryDebounceRef.current) {
      clearTimeout(queryDebounceRef.current);
    }
    queryDebounceRef.current = setTimeout(() => {
      setDebouncedQuery(newQuery);
    }, 300);
  }, []);

  // Debounce filter updates (500ms - filters are more expensive)
  const setFilters = useCallback((newFilters: DiamondFilters) => {
    if (filtersDebounceRef.current) {
      clearTimeout(filtersDebounceRef.current);
    }
    filtersDebounceRef.current = setTimeout(() => {
      setDebouncedFilters(newFilters);
    }, 500);
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (queryDebounceRef.current) {
        clearTimeout(queryDebounceRef.current);
      }
      if (filtersDebounceRef.current) {
        clearTimeout(filtersDebounceRef.current);
      }
    };
  }, []);

  const hookResult = useExternalDiamonds(
    debouncedQuery,
    debouncedFilters,
    initialPage,
    initialPerPage,
    initialCollection
  );

  return {
    ...hookResult,
    setQuery,
    setFilters,
    // Expose immediate values for UI
    immediateQuery: debouncedQuery,
    immediateFilters: debouncedFilters,
  };
}
