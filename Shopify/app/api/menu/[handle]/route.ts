import { NextResponse } from 'next/server';
import { shopService } from '@/services/shopify/shop.service';
import { resolveParams } from '@/utils/nextjs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ handle: string }> | { handle: string } }
) {
  try {
    const resolvedParams = await resolveParams(params);
    const { handle } = resolvedParams;

    if (!handle) {
      return NextResponse.json(
        { error: 'Menu handle is required' },
        { status: 400 }
      );
    }

    const menu = await shopService.getMenu(handle);
    return NextResponse.json({ menu });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch menu',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

