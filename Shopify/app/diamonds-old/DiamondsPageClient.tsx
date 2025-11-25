'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { LayoutGrid, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/modules/ProductCard';

// Code splitting for heavy components
const DiamondTable = dynamic(() => import('@/components/products/DiamondTable'), {
  loading: () => <div className="flex items-center justify-center h-64"><p className="text-[#667085]">Loading table...</p></div>,
  ssr: false,
});

const DiamondFilter = dynamic(() => import('@/components/pages/diamond-old/DiamondFilter'), {
  loading: () => <div className="flex items-center justify-center h-32"><p className="text-[#667085]">Loading filters...</p></div>,
  ssr: false,
});
import { useSearchParams } from 'next/navigation';
import { useDiamondFilters } from '@/hooks/pages/diamond-old/useDiamondFilters';
import { useViewMode } from '@/hooks/useViewMode';
import { DiamondFilters } from '@/types/filter.types';
import { Product } from '@/types/product';
import { Collection } from '@/types/collection';

interface DiamondsPageClientProps {
  initialProducts: Product[];
  initialCollections: Collection[];
}

export default function DiamondsPageClient({ initialProducts, initialCollections }: DiamondsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { viewMode, setViewMode } = useViewMode('grid');

  // Initialize filters with search params
  const initialFilters: DiamondFilters = useMemo(() => ({
    collection: '',
    shape: searchParams.get('shape') || '',
    minCarat: 0.25,
    maxCarat: 18.06,
    minPrice: 0,
    maxPrice: 10000000,
    minCut: 0,
    maxCut: 4, // Super Ideal (index 4)
    minColor: 0,
    maxColor: 6, // D (index 6)
    minClarity: 0,
    maxClarity: 7, // FL (index 7)
  }), [searchParams]);

  const { filters, updateFilters, filteredProducts } = useDiamondFilters(initialProducts, initialFilters);


  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-[1400px]">
      {/* Header with View Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <h1 className="font-serif text-[#101828] text-2xl sm:text-3xl lg:text-[36px] tracking-[-0.72px] leading-tight">
          Loose Diamonds
        </h1>
        
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 order-2 lg:order-1">
          <DiamondFilter
            filters={filters}
            onFilterChange={updateFilters}
            availableCollections={initialCollections}
          />
        </div>

        {/* Products Grid/Table */}
        <div className="lg:col-span-3 order-1 lg:order-2">
          {filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-[#667085]">No diamonds found. Try adjusting your filters.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <DiamondTable
              products={filteredProducts}
              onView={(product) => router.push(`/products/${product.handle}`)}
              onAddToCart={(product) => {
                const variant = product.variants?.edges?.[0]?.node;
                if (variant) {
                  router.push(`/api/checkout?variantId=${variant.id}`);
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

