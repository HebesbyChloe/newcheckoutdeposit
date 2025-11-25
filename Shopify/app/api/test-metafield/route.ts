import { NextRequest, NextResponse } from 'next/server';
import { metafieldService } from '@/services/shopify/admin/metafield.service';

/**
 * Test endpoint to create a metafield on a product
 * Usage: POST /api/test-metafield
 * Body: { productId: "gid://shopify/Product/...", namespace: "custom", key: "test", value: "test", type: "single_line_text_field" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, namespace = 'custom', key = 'test', value = 'test', type = 'single_line_text_field' } = body;

    if (!productId) {
      return NextResponse.json(
        { error: 'Missing productId' },
        { status: 400 }
      );
    }

    console.log('Testing metafield creation:', {
      productId,
      namespace,
      key,
      value,
      type,
    });

    const result = await metafieldService.setMetafield({
      namespace,
      key,
      value,
      type,
      ownerId: productId,
    });

    return NextResponse.json({
      success: !result.error,
      error: result.error,
      metafield: result.metafield,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV !== 'production' ? (error instanceof Error ? error.stack : undefined) : undefined,
      },
      { status: 500 }
    );
  }
}

