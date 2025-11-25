'use client';

import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { LayoutGrid, Table2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useExternalDiamondsWithDebounce } from '@/hooks/useExternalDiamonds';
import { DiamondFilters } from '@/types/filter.types';
import ExternalDiamondFilter from '@/components/pages/external-diamond/ExternalDiamondFilter';
import ProductCard from '@/components/modules/ProductCard';
import { Skeleton } from '@/components/ui/LoadingSkeleton';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { Product } from '@/types/product';

// Dynamic import for DiamondTable to reduce initial bundle size
const DiamondTable = dynamic(() => import('@/components/products/DiamondTable'), {
  loading: () => <div className="flex items-center justify-center h-32"><p className="text-[#667085]">Loading table...</p></div>,
  ssr: false,
});

const initialFilters: DiamondFilters = {
  collection: '',
  shape: '',
  minCarat: 0.25,
  maxCarat: 18.06,
  minPrice: 0,
  maxPrice: 10000000,
  minCut: 0,
  maxCut: 4, // Fair to Super Ideal (5 grades)
  minColor: 0,
  maxColor: 6, // J to D (7 grades)
  minClarity: 0,
  maxClarity: 7, // SI2 to FL (8 grades)
};

export default function ExternalDiamondsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Memoize URL params to prevent re-renders
  const initialParams = useMemo(() => ({
    query: searchParams.get('q') || '*',
    page: parseInt(searchParams.get('page') || '1', 10),
    perPage: parseInt(searchParams.get('per_page') || '12', 10),
    collection: (searchParams.get('collection') === 'natural' ? 'natural' : 'labgrown') as 'natural' | 'labgrown',
    filters: {
      collection: '',
      shape: searchParams.get('shape') || '',
      minCarat: parseFloat(searchParams.get('min_carat') || '0.25'),
      maxCarat: parseFloat(searchParams.get('max_carat') || '18.06'),
      minPrice: parseFloat(searchParams.get('min_price') || '0'),
      maxPrice: parseFloat(searchParams.get('max_price') || '10000000'),
      minCut: parseInt(searchParams.get('min_cut') || '0', 10),
      maxCut: parseInt(searchParams.get('max_cut') || '4', 10),
      minColor: parseInt(searchParams.get('min_color') || '0', 10),
      maxColor: parseInt(searchParams.get('max_color') || '6', 10),
      minClarity: parseInt(searchParams.get('min_clarity') || '0', 10),
      maxClarity: parseInt(searchParams.get('max_clarity') || '7', 10),
    } as DiamondFilters,
  }), [searchParams]);

  const {
    products,
    loading,
    isFetching,
    error,
    errorDetails,
    total,
    page,
    perPage,
    totalPages,
    collection,
    setCollection,
    setPage,
    setPerPage,
    setQuery,
    setFilters,
    immediateQuery,
    immediateFilters,
  } = useExternalDiamondsWithDebounce(
    initialParams.query,
    initialParams.filters,
    initialParams.page,
    initialParams.perPage,
    initialParams.collection
  );

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState(initialParams.query === '*' ? '' : initialParams.query);
  const [tableProducts, setTableProducts] = useState<Product[]>([]);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Memoize URL update function to prevent re-renders
  const updateURLParams = useCallback((updates: {
    q?: string;
    page?: number;
    per_page?: number;
    collection?: 'natural' | 'labgrown';
    filters?: DiamondFilters;
  }) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (updates.q !== undefined) {
      if (updates.q === '*' || !updates.q) {
        params.delete('q');
      } else {
        params.set('q', updates.q);
      }
    }
    
    if (updates.page !== undefined) {
      if (updates.page === 1) {
        params.delete('page');
      } else {
        params.set('page', String(updates.page));
      }
    }
    
    if (updates.per_page !== undefined) {
      if (updates.per_page === 12) {
        params.delete('per_page');
      } else {
        params.set('per_page', String(updates.per_page));
      }
    }
    
    if (updates.collection !== undefined) {
      if (updates.collection === 'natural') {
        params.set('collection', 'natural');
      } else {
        params.delete('collection');
      }
    }
    
    if (updates.filters) {
      const f = updates.filters;
      if (f.shape) params.set('shape', f.shape);
      else params.delete('shape');
      
      if (f.minCarat !== 0.25) params.set('min_carat', String(f.minCarat));
      else params.delete('min_carat');
      
      if (f.maxCarat !== 18.06) params.set('max_carat', String(f.maxCarat));
      else params.delete('max_carat');
      
      if (f.minPrice !== 0) params.set('min_price', String(f.minPrice));
      else params.delete('min_price');
      
      if (f.maxPrice !== 10000000) params.set('max_price', String(f.maxPrice));
      else params.delete('max_price');
      
      if (f.minCut !== 0) params.set('min_cut', String(f.minCut));
      else params.delete('min_cut');
      
      if (f.maxCut !== 4) params.set('max_cut', String(f.maxCut));
      else params.delete('max_cut');
      
      if (f.minColor !== 0) params.set('min_color', String(f.minColor));
      else params.delete('min_color');
      
      if (f.maxColor !== 6) params.set('max_color', String(f.maxColor));
      else params.delete('max_color');
      
      if (f.minClarity !== 0) params.set('min_clarity', String(f.minClarity));
      else params.delete('min_clarity');
      
      if (f.maxClarity !== 7) params.set('max_clarity', String(f.maxClarity));
      else params.delete('max_clarity');
    }
    
    router.push(`/diamonds-external?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // Handle filter changes with debouncing (handled by hook)
  const handleFilterChange = useCallback((newFilters: DiamondFilters) => {
    setFilters(newFilters);
    setPage(1);
    // Update URL after debounce (filters are debounced in hook)
    // We'll update URL when filters actually change in the hook
  }, [setFilters, setPage]);

  // Handle collection change
  const handleCollectionChange = useCallback((newCollection: 'natural' | 'labgrown') => {
    setCollection(newCollection);
    updateURLParams({ collection: newCollection, page: 1 });
  }, [setCollection, updateURLParams]);

  // Handle search change with debouncing (handled by hook)
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setQuery(value);
    setPage(1);
    // Update URL after debounce
    const query = value.trim() || '*';
    updateURLParams({ q: query, page: 1 });
  }, [setQuery, setPage, updateURLParams]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    updateURLParams({ page: newPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setPage, updateURLParams]);

  const handlePerPageChange = useCallback((newPerPage: number) => {
    setPerPage(newPerPage);
    updateURLParams({ per_page: newPerPage, page: 1 });
  }, [setPerPage, updateURLParams]);

  // Update URL when filters actually change (after debounce)
  useEffect(() => {
    updateURLParams({ filters: immediateFilters });
  }, [immediateFilters, updateURLParams]);

  // Manage accumulated products for table infinite scroll
  useEffect(() => {
    if (viewMode !== 'table') return;

    if (page === 1) {
      setTableProducts(products);
    } else {
      setTableProducts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newOnes = products.filter((p) => !existingIds.has(p.id));
        return [...prev, ...newOnes];
      });
    }
  }, [products, page, viewMode]);

  // Reset table products when switching away from table view
  useEffect(() => {
    if (viewMode !== 'table') {
      setTableProducts([]);
    }
  }, [viewMode]);

  // Infinite scroll observer for table view
  useEffect(() => {
    if (viewMode !== 'table') return;
    const target = loadMoreRef.current;
    if (!target) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;

        // Avoid triggering while fetching or when on last page
        if (isFetching || loading || page >= totalPages) return;

        setPage(page + 1);
      },
      {
        root: null,
        rootMargin: '200px',
        threshold: 0.1,
      }
    );

    observerRef.current.observe(target);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [viewMode, isFetching, loading, page, totalPages, setPage]);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-[1400px]">
      {/* Header with Search and View Toggle */}
      <div className="mb-6 sm:mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-[#101828] text-2xl sm:text-3xl lg:text-[36px] tracking-[-0.72px] leading-tight">
              External Diamonds
            </h1>
            {total > 0 && (
              <p className="text-sm text-[#667085] mt-2">
                {total.toLocaleString()} {total === 1 ? 'diamond' : 'diamonds'} found
              </p>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'bg-[#3d6373] hover:bg-[#2d4d5a] text-white' : 'border-[#3d6373] text-[#3d6373]'}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('table')}
              className={viewMode === 'table' ? 'bg-[#3d6373] hover:bg-[#2d4d5a] text-white' : 'border-[#3d6373] text-[#3d6373]'}
            >
              <Table2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Search Input */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#667085]" />
          <Input
            type="text"
            placeholder="Search diamonds..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
              onClick={() => handleSearchChange('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
          {errorDetails && (
            <details className="mt-2">
              <summary className="text-xs text-red-500 cursor-pointer">Error details</summary>
              <pre className="text-xs mt-2 overflow-auto max-h-48 bg-white p-2 rounded border">
                {JSON.stringify(errorDetails, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 order-2 lg:order-1">
          <ExternalDiamondFilter
            filters={immediateFilters}
            collection={collection}
            onCollectionChange={handleCollectionChange}
            onFilterChange={handleFilterChange}
          />
        </div>

        {/* Products Grid/Table */}
        <div className="lg:col-span-3 order-1 lg:order-2">
          {loading && products.length === 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-96 w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))}
              </div>
            )
          ) : products.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-[#667085]">No diamonds found. Try adjusting your filters.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 items-stretch">
                {products.map((product) => {
                  // Extract itemId from product handle (format: diamond-{itemId})
                  const itemId = product.handle.replace('diamond-', '');
                  // Get collection from URL or state
                  const collectionParam = collection === 'natural' ? 'natural' : 'labgrown';
                  const href = `/diamonds-external/${itemId}?collection=${collectionParam}`;
                  
                  return (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      href={href}
                      collection={collection}
                    />
                  );
                })}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-border">
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-[#667085]">
                      Page {page} of {totalPages} ({total.toLocaleString()} total)
                    </div>
                    <div className="flex items-center gap-2">
                      <label htmlFor="per-page" className="text-sm text-[#667085]">Per page:</label>
                      <select
                        id="per-page"
                        value={perPage}
                        onChange={(e) => handlePerPageChange(parseInt(e.target.value, 10))}
                        className="px-2 py-1 border border-border rounded-md text-sm"
                        disabled={loading}
                      >
                        <option value="12">12</option>
                        <option value="24">24</option>
                        <option value="48">48</option>
                        <option value="96">96</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(Math.max(1, page - 1))}
                      disabled={page === 1 || loading}
                    >
                      Previous
                    </Button>
                    
                    {/* Page Numbers */}
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (page >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={page === pageNum ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            disabled={loading}
                            className={page === pageNum ? 'bg-[#3d6373] hover:bg-[#2d4d5a] text-white' : ''}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    
                    {totalPages > 5 && page < totalPages - 2 && (
                      <span className="text-[#667085] px-2">...</span>
                    )}
                    
                    {totalPages > 5 && page < totalPages - 2 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(totalPages)}
                        disabled={loading}
                      >
                        {totalPages}
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages || loading}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <DiamondTable
                products={tableProducts.length ? tableProducts : products}
                collection={collection}
              />
              {/* Infinite scroll sentinel & status for table view */}
              {viewMode === 'table' && totalPages > 1 && (
                <div className="mt-4 flex flex-col items-center justify-center gap-2">
                  {page < totalPages && (
                    <div
                      ref={loadMoreRef}
                      className="h-10 flex items-center justify-center text-sm text-[#667085]"
                    >
                      {isFetching ? 'Loading more diamonds...' : 'Scroll to load more diamonds'}
                    </div>
                  )}
                  {page >= totalPages && (
                    <div className="text-xs text-[#98A2B3]">
                      You&apos;ve reached the end of the results.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
