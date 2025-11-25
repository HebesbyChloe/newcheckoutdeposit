import { NextResponse } from 'next/server';
import { productsService } from '@/services/shopify/products.service';
import { resolveParams } from '@/utils/nextjs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ handle: string }> | { handle: string } }
) {
  try {
    // Handle params as either Promise or direct object (Next.js 14/15 compatibility)
    const resolvedParams = await resolveParams(params);
    const product = await productsService.getProductByHandle(resolvedParams.handle);

    if (!product) {
      return NextResponse.json(
        { 
          error: 'Product not found',
          handle: resolvedParams.handle,
          message: `No product found with handle: ${resolvedParams.handle}`
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        title: product.title,
        handle: product.handle,
        hasImages: (product.images?.edges?.length || 0) > 0,
        hasVariants: (product.variants?.edges?.length || 0) > 0,
        hasMetafields: false, // Metafields not included in query
      }
    });
  } catch (error) {
    const resolvedParams = await resolveParams(params);
    return NextResponse.json(
      { 
        error: 'Failed to fetch product',
        handle: resolvedParams.handle,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

