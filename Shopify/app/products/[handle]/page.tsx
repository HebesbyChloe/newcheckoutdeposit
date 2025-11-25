import { productsService } from '@/services/shopify/products.service';
import { notFound } from 'next/navigation';
import { Product } from '@/types/product';
import ProductDetailDemo from '@/components/products/ProductDetailDemo';
import { typesenseSearchService } from '@/services/typesense/search.service';
import { transformTypesenseHitsToProducts } from '@/utils/typesense/response-transformer';

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getProduct(handle: string, collectionParam?: string): Promise<Product | null> {
  const trimmedHandle = handle.trim();
  
  try {
    // Check if this is an external diamond (handle starts with "diamond-")
    if (trimmedHandle.startsWith('diamond-')) {
      // Extract itemId from handle and trim whitespace
      const itemId = trimmedHandle.replace('diamond-', '').trim();
      
      if (!itemId) {
        console.error('❌ [PRODUCT PAGE] Invalid itemId extracted from handle:', trimmedHandle);
        return null;
      }
      
      // Determine collection from URL parameter, default to 'labgrown'
      const collection = (collectionParam === 'natural' ? 'natural' : 'labgrown') as 'natural' | 'labgrown';
      
      // Fetch from Typesense API with collection
      const response = await typesenseSearchService.getProductByItemId(itemId, collection);

      if (!response.hits || response.hits.length === 0) {
        // Try other collection if not found
        const otherCollection = collection === 'labgrown' ? 'natural' : 'labgrown';
        const otherResponse = await typesenseSearchService.getProductByItemId(itemId, otherCollection);
        
        if (!otherResponse.hits || otherResponse.hits.length === 0) {
          console.warn('⚠️ [PRODUCT PAGE] No hits found for itemId:', {
            itemId,
            triedCollections: [collection, otherCollection],
          });
          return null;
        }
        
        // Transform the hit to Product structure
        const products = transformTypesenseHitsToProducts(otherResponse.hits);
        
        if (products.length === 0) {
          console.warn('⚠️ [PRODUCT PAGE] No products after transformation:', {
            itemId,
            collection: otherCollection,
            hitsCount: otherResponse.hits.length,
          });
          return null;
        }

        return products[0];
      }

      // Transform the hit to Product structure
      const products = transformTypesenseHitsToProducts(response.hits);
      
      if (products.length === 0) {
        console.warn('⚠️ [PRODUCT PAGE] No products after transformation:', {
          itemId,
          collection,
          hitsCount: response.hits.length,
        });
        return null;
      }

      return products[0];
    }
    
    // Only reach here if handle does NOT start with "diamond-"
    // Use the service method which has fallback logic for metafields
    const product = await productsService.getProductByHandle(trimmedHandle);

    if (product) {
      return product;
    }

    // If not found via service, try searching all products as fallback (case-insensitive)
    // This helps with case sensitivity issues
    try {
      const allProducts = await productsService.getProducts(250);
      const foundProduct = allProducts.find(
        (p) => p.handle.toLowerCase() === trimmedHandle.toLowerCase()
      );

      if (foundProduct) {
        return foundProduct;
      }
    } catch (fallbackError) {
      console.error('Error in fallback product search:', fallbackError);
    }

    return null;
  } catch (error) {
    console.error('❌ [PRODUCT PAGE] Error fetching product:', error);
    
    // Re-throw with enhanced error details if it's an external diamond error
    if (error instanceof Error && (error as any).details) {
      throw error; // Already has details, just re-throw
    }
    
    // For other errors, wrap with basic details
    if (error instanceof Error) {
      const enhancedError = new Error(error.message);
      (enhancedError as any).details = {
        originalError: error.message,
        stack: error.stack,
      };
      throw enhancedError;
    }
    
    throw error;
  }
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }> | { handle: string };
  searchParams?: Promise<{ collection?: string }> | { collection?: string };
}) {
  try {
    // Handle params as either Promise or direct object (Next.js 14/15 compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    const resolvedSearchParams = searchParams instanceof Promise ? await searchParams : (searchParams || {});
    
    if (!resolvedParams?.handle) {
      console.error('No handle provided in params:', resolvedParams);
      notFound();
    }
    
    const product = await getProduct(resolvedParams.handle, resolvedSearchParams?.collection);

    if (!product) {
      console.error('Product not found for handle:', resolvedParams.handle);
      notFound();
    }

    // Validate product has required fields
    if (!product.id || !product.title) {
      console.error('Product missing required fields:', { id: product.id, title: product.title });
      throw new Error('Invalid product data structure');
    }

    return <ProductDetailDemo product={product} />;
  } catch (error) {
    console.error('Error rendering product page:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    }
    throw error; // Re-throw to show error page
  }
}