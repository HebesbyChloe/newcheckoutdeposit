'use client';

import dynamic from 'next/dynamic';
import ProductCard from '@/components/modules/ProductCard';

// Code splitting for heavy filter component
const JewelryFilter = dynamic(() => import('@/components/pages/jewelry/JewelryFilter'), {
  loading: () => <div className="flex items-center justify-center h-32"><p className="text-[#667085]">Loading filters...</p></div>,
  ssr: false,
});
import { useJewelryFilters } from '@/hooks/pages/jewelry/useJewelryFilters';
import { Product } from '@/types/product';
import { Collection } from '@/types/collection';

interface JewelryPageClientProps {
  initialProducts: Product[];
  initialCollections: Collection[];
}

export default function JewelryPageClient({ initialProducts, initialCollections }: JewelryPageClientProps) {
  const { filters, updateFilters, filteredProducts } = useJewelryFilters(initialProducts);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <h1 className="font-serif text-[#101828] text-2xl sm:text-3xl lg:text-[36px] tracking-[-0.72px] leading-tight">
          Jewelry Collection
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 order-2 lg:order-1">
          <JewelryFilter
            filters={filters}
            onFilterChange={updateFilters}
            availableCollections={initialCollections}
          />
        </div>

        {/* Products Grid */}
        <div className="lg:col-span-3 order-1 lg:order-2">
          {filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-[#667085]">No jewelry found. Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

