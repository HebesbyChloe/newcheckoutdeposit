import { NextResponse } from 'next/server';
import { shopService } from '@/services/shopify/shop.service';

export async function GET() {
  try {
    const shop = await shopService.getShop();
    return NextResponse.json({ shop });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch shop information',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

