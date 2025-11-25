import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/shopify/admin/client';

/**
 * Test endpoint to check product publications
 * Usage: GET /api/test-product-publications?productId=gid://shopify/Product/...
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId') || 'gid://shopify/Product/10021683822896';

    // Query product publications
    const query = `
      query getProductPublications($id: ID!) {
        product(id: $id) {
          id
          title
          status
          publishedOnCurrentPublication
        }
        publications(first: 10) {
          edges {
            node {
              id
              name
            }
          }
        }
      }
    `;

    const data = await adminClient.request<{
      product: {
        id: string;
        title: string;
        status: string;
        publishedOnCurrentPublication: boolean;
        publishedOnPublication: {
          id: string;
          name: string;
        } | null;
      } | null;
      publications: {
        edges: Array<{
          node: {
            id: string;
            name: string;
          };
        }>;
      };
    }>(query, { id: productId });

    return NextResponse.json({
      success: true,
      product: data.product,
      publications: data.publications.edges.map((e) => e.node),
      isPublished: data.product?.publishedOnCurrentPublication || false,
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

