import { notFound } from 'next/navigation';
import { Product } from '@/types/product';
import { typesenseSearchService } from '@/services/typesense/search.service';
import { transformTypesenseHitsToProducts } from '@/utils/typesense/response-transformer';
import { mapExternalDiamondToDetailProps, getExternalProductPayload } from '@/utils/external-product';
import ExternalDiamondDetailClient from './ExternalDiamondDetailClient';

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getDiamondByItemId(itemId: string, collection: 'natural' | 'labgrown' = 'natural'): Promise<Product | null> {
  try {
    const trimmedItemId = itemId.trim();
    
    // Fetch from Typesense API with collection
    const response = await typesenseSearchService.getProductByItemId(trimmedItemId, collection);

    if (!response.hits || response.hits.length === 0) {
      console.warn('⚠️ [EXTERNAL DIAMOND PAGE] No hits found for itemId:', {
        itemId: trimmedItemId,
        collection,
        endpoint: collection === 'natural' ? '/search/natural' : '/search/labgrown',
      });
      return null;
    }

    // Transform the hit to Product structure
    const products = transformTypesenseHitsToProducts(response.hits);
    
    if (products.length === 0) {
      console.warn('⚠️ [EXTERNAL DIAMOND PAGE] No products after transformation:', {
        itemId: trimmedItemId,
        collection,
        hitsCount: response.hits.length,
      });
      return null;
    }

    return products[0];
  } catch (error) {
    console.error('❌ [EXTERNAL DIAMOND PAGE] Error fetching diamond:', {
      itemId,
      collection,
      endpoint: collection === 'natural' ? '/search/natural' : '/search/labgrown',
      error: error instanceof Error ? error.message : String(error),
      details: (error as any).details,
    });
    
    // Re-throw with enhanced error details for error page
    if (error instanceof Error) {
      const enhancedError = new Error(error.message);
      (enhancedError as any).details = {
        ...(error as any).details,
        itemId,
        collection,
        endpoint: collection === 'natural' ? '/search/natural' : '/search/labgrown',
        originalError: error.message,
      };
      throw enhancedError;
    }
    
    throw error;
  }
}

export default async function ExternalDiamondPage({
  params,
  searchParams,
}: {
  params: Promise<{ itemId: string }> | { itemId: string };
  searchParams: Promise<{ collection?: string }> | { collection?: string };
}) {
  try {
    // Handle params as either Promise or direct object (Next.js 14/15 compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    const resolvedSearchParams = searchParams instanceof Promise ? await searchParams : searchParams;
    
    if (!resolvedParams?.itemId) {
      console.error('No itemId provided in params:', resolvedParams);
      notFound();
    }
    
    // Extract itemId from handle if it's in format "diamond-{itemId}"
    let itemId = resolvedParams.itemId;
    if (itemId.startsWith('diamond-')) {
      itemId = itemId.replace('diamond-', '');
    }

    // Get collection from query string (default: 'labgrown')
    const collection = (resolvedSearchParams?.collection === 'natural' ? 'natural' : 'labgrown') as 'natural' | 'labgrown';
    
    const product = await getDiamondByItemId(itemId, collection);

    if (!product) {
      console.error('❌ [EXTERNAL DIAMOND PAGE] Diamond not found for itemId:', {
        itemId,
        collection,
        endpoint: collection === 'natural' ? '/search/natural' : '/search/labgrown',
      });
      
      // Throw error with details for error page
      const notFoundError = new Error(`Diamond not found for itemId: ${itemId}`);
      (notFoundError as any).details = {
        itemId,
        collection,
        endpoint: collection === 'natural' ? '/search/natural' : '/search/labgrown',
        message: 'Diamond not found in the external feed',
      };
      throw notFoundError;
    }

    // Validate product has required fields
    if (!product.id || !product.title) {
      console.error('❌ [EXTERNAL DIAMOND PAGE] Product missing required fields:', { 
        id: product.id, 
        title: product.title,
        itemId,
        collection,
      });
      const invalidError = new Error('Invalid product data structure');
      (invalidError as any).details = {
        itemId,
        collection,
        endpoint: collection === 'natural' ? '/search/natural' : '/search/labgrown',
        productId: product.id,
        productTitle: product.title,
      };
      throw invalidError;
    }

    const payload = getExternalProductPayload(product);
    const diamondDetail = mapExternalDiamondToDetailProps(product, payload);

    return (
      <ExternalDiamondDetailClient
        product={product}
        collection={collection}
        diamond={diamondDetail}
      />
    );
  } catch (error) {
    console.error('❌ [EXTERNAL DIAMOND PAGE] Error rendering page:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        details: (error as any).details,
      });
    }
    throw error; // Re-throw to show error page
  }
}
