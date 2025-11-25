import { NextRequest, NextResponse } from 'next/server';
import { productsService } from '@/services/shopify/products.service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || !query.trim()) {
      return NextResponse.json({ products: [] });
    }

    const products = await productsService.searchProducts(query.trim(), 50);

    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to search products',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

