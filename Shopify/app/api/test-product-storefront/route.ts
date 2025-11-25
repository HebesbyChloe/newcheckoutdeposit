import { NextRequest, NextResponse } from 'next/server';
import { shopifyClient } from '@/lib/shopify';

/**
 * Test endpoint to check if product is available in Storefront API
 * Usage: GET /api/test-product-storefront?productId=gid://shopify/Product/...
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json(
        { error: 'productId is required' },
        { status: 400 }
      );
    }

    // Query product via Storefront API
    const query = `
      query getProduct($id: ID!) {
        product(id: $id) {
          id
          title
          availableForSale
          variants(first: 10) {
            edges {
              node {
                id
                title
                price {
                  amount
                  currencyCode
                }
                availableForSale
              }
            }
          }
        }
      }
    `;

    const data = await shopifyClient.request<{
      product: {
        id: string;
        title: string;
        availableForSale: boolean;
        variants: {
          edges: Array<{
            node: {
              id: string;
              title: string;
              price: {
                amount: string;
                currencyCode: string;
              };
              availableForSale: boolean;
            };
          }>;
        };
      } | null;
    }>(query, { id: productId });

    if (!data.product) {
      return NextResponse.json({
        success: false,
        error: 'Product not found in Storefront API',
        productId,
      });
    }

    return NextResponse.json({
      success: true,
      product: {
        id: data.product.id,
        title: data.product.title,
        availableForSale: data.product.availableForSale,
      },
      variants: data.product.variants.edges.map((edge) => ({
        id: edge.node.id,
        title: edge.node.title,
        price: edge.node.price,
        availableForSale: edge.node.availableForSale,
      })),
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

