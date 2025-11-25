import { NextRequest, NextResponse } from 'next/server';
import { shopifyClient } from '@/lib/shopify';

/**
 * Test endpoint to check if variant is available in Storefront API
 * Usage: GET /api/test-variant-storefront?variantId=gid://shopify/ProductVariant/...
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const variantId = searchParams.get('variantId');

    if (!variantId) {
      return NextResponse.json(
        { error: 'variantId is required' },
        { status: 400 }
      );
    }

    // Query variant via Storefront API
    const query = `
      query getVariant($id: ID!) {
        node(id: $id) {
          ... on ProductVariant {
            id
            title
            price {
              amount
              currencyCode
            }
            availableForSale
            product {
              id
              title
              availableForSale
            }
          }
        }
      }
    `;

    const data = await shopifyClient.request<{
      node: {
        id: string;
        title: string;
        price: {
          amount: string;
          currencyCode: string;
        };
        availableForSale: boolean;
        product: {
          id: string;
          title: string;
          status: string;
          availableForSale: boolean;
        };
      } | null;
    }>(query, { id: variantId });

    if (!data.node) {
      return NextResponse.json({
        success: false,
        error: 'Variant not found in Storefront API',
        variantId,
      });
    }

    return NextResponse.json({
      success: true,
      variant: data.node,
      isAvailable: data.node.availableForSale,
      productAvailable: data.node.product.availableForSale,
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

