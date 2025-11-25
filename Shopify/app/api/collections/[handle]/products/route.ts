import { NextRequest, NextResponse } from 'next/server';
import { collectionsService } from '@/services/shopify/collections.service';
import { resolveParams } from '@/utils/nextjs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> | { handle: string } }
) {
  try {
    const resolvedParams = await resolveParams(params);
    const { handle } = resolvedParams;
    const searchParams = request.nextUrl.searchParams;
    const first = parseInt(searchParams.get('first') || '250', 10);

    if (!handle) {
      return NextResponse.json(
        { error: 'Collection handle is required' },
        { status: 400 }
      );
    }

    const products = await collectionsService.getProductsByCollection(
      handle,
      first
    );

    return NextResponse.json({ products, count: products.length });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch collection products',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

