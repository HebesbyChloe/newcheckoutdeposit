import { Suspense } from 'react';
import { productsService } from '@/services/shopify/products.service';
import SearchResults from '@/components/search/SearchResults';
import { Loader2 } from 'lucide-react';

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

async function SearchContent({ query }: { query: string | null }) {
  if (!query) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <div className="text-center py-12">
          <p className="text-[#667085] text-lg">Enter a search term to find products</p>
        </div>
      </div>
    );
  }

  const products = await productsService.searchProducts(query, 50);

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      <SearchResults products={products} query={query} />
    </div>
  );
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q || null;
  return (
    <div>
      <Suspense
        fallback={
          <div className="container mx-auto px-4 py-12 max-w-7xl">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#3d6373]" />
              <p className="text-[#667085] ml-2">Searching...</p>
            </div>
          </div>
        }
      >
        <SearchContent query={query} />
      </Suspense>
    </div>
  );
}

