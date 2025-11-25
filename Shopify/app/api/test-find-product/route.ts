import { NextRequest, NextResponse } from 'next/server';
import { adminProductService } from '@/services/shopify/admin/product.service';
import { externalCartService } from '@/services/shopify/external-cart.service';

/**
 * Test endpoint to find dummy products by source_type
 * Usage: GET /api/test-find-product?source_type=labgrown
 *        GET /api/test-find-product?source_type=natural
 *        GET /api/test-find-product (tests both)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sourceType = searchParams.get('source_type') as 'labgrown' | 'natural' | null;

    const results: any = {};

    if (sourceType) {
      // Test finding by metafield
      const metafieldResult = await adminProductService.findProductByMetafield('custom', 'source_type', sourceType);
      
      // Test finding via external cart service
      const dummyProductResult = await externalCartService.findDummyProduct(sourceType);

      results[sourceType] = {
        metafieldSearch: {
          found: !!metafieldResult.product,
          product: metafieldResult.product ? {
            id: metafieldResult.product.id,
            title: metafieldResult.product.title,
            status: metafieldResult.product.status,
            variantCount: metafieldResult.product.variants?.length || 0,
          } : null,
          error: metafieldResult.error,
        },
        externalCartService: {
          found: !!dummyProductResult.productId,
          productId: dummyProductResult.productId,
          error: dummyProductResult.error,
        },
      };
    } else {
      // Test both
      for (const type of ['labgrown', 'natural'] as const) {
        const metafieldResult = await adminProductService.findProductByMetafield('custom', 'source_type', type);
        const dummyProductResult = await externalCartService.findDummyProduct(type);

        results[type] = {
          metafieldSearch: {
            found: !!metafieldResult.product,
            product: metafieldResult.product ? {
              id: metafieldResult.product.id,
              title: metafieldResult.product.title,
              status: metafieldResult.product.status,
              variantCount: metafieldResult.product.variants?.length || 0,
            } : null,
            error: metafieldResult.error,
          },
          externalCartService: {
            found: !!dummyProductResult.productId,
            productId: dummyProductResult.productId,
            error: dummyProductResult.error,
          },
        };
      }
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV !== 'production' ? (error instanceof Error ? error.stack : undefined) : undefined,
      },
      { status: 500 }
    );
  }
}

