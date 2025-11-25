import { NextRequest, NextResponse } from 'next/server';
import { adminProductService } from '@/services/shopify/admin/product.service';

/**
 * Test endpoint to publish product to Online Store
 * Usage: GET /api/test-publish-product?productId=gid://shopify/Product/...
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId') || 'gid://shopify/Product/10021683822896';

    const result = await adminProductService.publishProductToOnlineStore(productId);

    return NextResponse.json({
      success: result.success,
      error: result.error,
      productId,
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

