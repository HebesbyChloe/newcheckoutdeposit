import { NextResponse } from 'next/server';
import { productsService } from '@/services/shopify/products.service';

export async function GET() {
  try {
    const products = await productsService.getProducts(250);
    
    if (products.length === 0) {
    }
    
    return NextResponse.json(products);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch products', 
        message: errorMessage
      }, 
      { status: 500 }
    );
  }
}

