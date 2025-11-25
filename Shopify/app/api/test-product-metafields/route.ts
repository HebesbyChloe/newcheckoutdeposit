import { NextRequest, NextResponse } from 'next/server';
import { adminProductService } from '@/services/shopify/admin/product.service';
import { metafieldService } from '@/services/shopify/admin/metafield.service';

/**
 * Test endpoint to check metafields on a product
 * Usage: GET /api/test-product-metafields?productId=gid://shopify/Product/...
 *        GET /api/test-product-metafields (checks dummy products)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');

    if (productId) {
      // Check specific product
      const metafieldsResult = await metafieldService.getProductMetafields(productId);
      const productResult = await adminProductService.getProduct(productId);

      return NextResponse.json({
        success: true,
        productId,
        product: productResult.product ? {
          id: productResult.product.id,
          title: productResult.product.title,
          status: productResult.product.status,
        } : null,
        metafields: metafieldsResult.metafields,
        metafieldError: metafieldsResult.error,
        productError: productResult.error,
      });
    }

    // Check dummy products
    const results: any = {};

    for (const sourceType of ['labgrown', 'natural'] as const) {
      // Find product by title
      const titleResult = await adminProductService.findProductsByTitle(`External Dummy - ${sourceType}`);
      
      if (titleResult.products && titleResult.products.length > 0) {
        const product = titleResult.products[0];
        const metafieldsResult = await metafieldService.getProductMetafields(product.id);

        results[sourceType] = {
          product: {
            id: product.id,
            title: product.title,
            status: product.status,
          },
          metafields: metafieldsResult.metafields,
          metafieldError: metafieldsResult.error,
          // Check for source_type metafield
          hasSourceTypeMetafield: metafieldsResult.metafields?.some(
            (mf) => mf.namespace === 'custom' && mf.key === 'source_type' && mf.value === sourceType
          ) || false,
        };
      } else {
        results[sourceType] = {
          error: 'Product not found',
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

