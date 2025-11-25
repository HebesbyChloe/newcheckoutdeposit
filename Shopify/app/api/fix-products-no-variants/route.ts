import { NextRequest, NextResponse } from 'next/server';
import { adminProductService } from '@/services/shopify/admin/product.service';
import { externalCartService } from '@/services/shopify/external-cart.service';

/**
 * Utility endpoint to fix existing dummy products that have no variants
 * This should only be used for debugging/fixing existing products
 */
export async function POST(request: NextRequest) {
  try {
    const { sourceType } = await request.json();

    if (!sourceType || !['labgrown', 'natural'].includes(sourceType)) {
      return NextResponse.json(
        { error: 'Invalid sourceType. Must be "labgrown" or "natural"' },
        { status: 400 }
      );
    }

    // Find the dummy product
    const findResult = await externalCartService.findDummyProduct(sourceType as 'labgrown' | 'natural');

    if (findResult.error || !findResult.productId) {
      return NextResponse.json(
        { error: 'Failed to find dummy product', details: findResult.error },
        { status: 404 }
      );
    }

    // Get the product to check variants
    const productResult = await adminProductService.getProduct(findResult.productId);

    if (productResult.error || !productResult.product) {
      return NextResponse.json(
        { error: 'Failed to get product', details: productResult.error },
        { status: 500 }
      );
    }

    // If product has no variants, create one
    if (productResult.product.variants.length === 0) {
      const variantResult = await adminProductService.createVariant(findResult.productId, {
        price: '0.00',
        sku: `DUMMY-${sourceType.toUpperCase()}`,
      });

      if (variantResult.error || !variantResult.variant) {
        return NextResponse.json(
          {
            error: 'Failed to create variant',
            details: variantResult.error,
            productId: findResult.productId,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Created variant for product',
        productId: findResult.productId,
        variant: variantResult.variant,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Product already has variants',
      productId: findResult.productId,
      variantCount: productResult.product.variants.length,
      variants: productResult.product.variants,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

