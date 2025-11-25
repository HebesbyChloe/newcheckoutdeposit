'use client';

import { Product } from '@/types/product';
import ProductCard from '@/components/modules/ProductCard';
import { Loader2 } from 'lucide-react';

interface SearchResultsProps {
  products: Product[];
  query: string;
  loading?: boolean;
}

export default function SearchResults({ products, query, loading }: SearchResultsProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#3d6373]" />
        <p className="text-[#667085] ml-2">Searching...</p>
      </div>
    );
  }

  if (!query) {
    return (
      <div className="text-center py-12">
        <p className="text-[#667085] text-lg">Enter a search term to find products</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[#1d2939] text-lg font-semibold mb-2">
          No products found for &quot;{query}&quot;
        </p>
        <p className="text-[#667085]">Try a different search term</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#1d2939] mb-2">
          Search results for &quot;{query}&quot;
        </h2>
        <p className="text-[#667085]">
          Found {products.length} {products.length === 1 ? 'product' : 'products'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

