'use client';

import Link from 'next/link';
import { Product } from '@/types/product';
import { Search } from 'lucide-react';

interface SearchDropdownProps {
  results: Product[];
  query: string;
  loading?: boolean;
  onSelect?: () => void;
}

export default function SearchDropdown({ results, query, loading, onSelect }: SearchDropdownProps) {
  if (loading) {
    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
        <div className="p-4 text-center text-[#667085]">
          <p>Searching...</p>
        </div>
      </div>
    );
  }

  if (results.length === 0 && query) {
    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
        <div className="p-4 text-center text-[#667085]">
          <p>No products found</p>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return null;
  }

  const displayResults = results.slice(0, 5);
  const hasMore = results.length > 5;

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
      <div className="py-2">
        {displayResults.map((product) => {
          const image = product.images?.edges?.[0]?.node?.url || '';
          const price = product.variants?.edges?.[0]?.node?.price?.amount || product.priceRange?.minVariantPrice?.amount || '0';
          const currency = product.variants?.edges?.[0]?.node?.price?.currencyCode || product.priceRange?.minVariantPrice?.currencyCode || 'USD';

          return (
            <Link
              key={product.id}
              href={`/products/${product.handle}`}
              onClick={onSelect}
              className="flex items-center gap-4 p-3 hover:bg-gray-50 transition-colors"
            >
              {image && (
                <img
                  src={image}
                  alt={product.title}
                  className="w-16 h-16 object-cover rounded"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-[#1d2939] truncate">{product.title}</h3>
                <p className="text-sm text-[#667085]">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency,
                  }).format(parseFloat(price))}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
      {hasMore && (
        <Link
          href={`/search?q=${encodeURIComponent(query)}`}
          onClick={onSelect}
          className="block px-4 py-3 text-center text-sm font-medium text-[#2c5f6f] hover:bg-gray-50 border-t border-gray-200"
        >
          See all {results.length} results
        </Link>
      )}
    </div>
  );
}

