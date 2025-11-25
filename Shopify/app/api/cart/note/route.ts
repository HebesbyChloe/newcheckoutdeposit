import { NextRequest, NextResponse } from 'next/server';
import { cartService } from '@/services/shopify/cart.service';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { cartId, note } = body;

    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart ID is required' },
        { status: 400 }
      );
    }

    const cart = await cartService.updateCartNote(cartId, note || '');

    if (!cart) {
      return NextResponse.json(
        { error: 'Failed to update cart note' },
        { status: 500 }
      );
    }

    return NextResponse.json({ cart });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to update cart note',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

