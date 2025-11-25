import { NextResponse } from 'next/server';
import { recommendationsService } from '@/services/shopify/recommendations.service';
import { resolveParams } from '@/utils/nextjs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string }> | { productId: string } }
) {
  try {
    const resolvedParams = await resolveParams(params);
    const { productId } = resolvedParams;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const recommendations =
      await recommendationsService.getProductRecommendations(productId);

    return NextResponse.json({
      recommendations,
      count: recommendations.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch recommendations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

