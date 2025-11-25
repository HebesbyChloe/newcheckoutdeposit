import { NextResponse } from 'next/server';
import { collectionsService } from '@/services/shopify/collections.service';

export async function GET() {
  try {
    const collections = await collectionsService.getCollections(250);
    return NextResponse.json(collections);
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to fetch collections', 
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : String(error)
      }, 
      { status: 500 }
    );
  }
}

