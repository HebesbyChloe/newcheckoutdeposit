import { NextRequest, NextResponse } from 'next/server';
import { internalCartStorage } from '@/lib/storage/cart-storage';
import { InternalCart } from '@/types/internal-cart.types';
import { transformInternalCartToCart } from './transform';

// GET /api/internal-cart?id=... - Get internal cart by ID
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cartId = searchParams.get('id');

    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart ID is required' },
        { status: 400 }
      );
    }

    const internalCart = internalCartStorage.getCart(cartId);
    if (!internalCart) {
      return NextResponse.json(
        { error: 'Cart not found' },
        { status: 404 }
      );
    }

    const cart = transformInternalCartToCart(internalCart);
    return NextResponse.json({ cart });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch internal cart',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST /api/internal-cart - Create a new empty cart
export async function POST(request: NextRequest) {
  try {
    // Optionally accept a predefined cartId (for future extension), otherwise generate
    const body = await request.json().catch(() => ({}));
    const providedCartId = body?.cartId as string | undefined;

    const cartId = providedCartId || internalCartStorage.generateCartId();
    const internalCart: InternalCart = internalCartStorage.createCart(cartId, {
      items: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const cart = transformInternalCartToCart(internalCart);
    return NextResponse.json({ cartId: internalCart.id, cart });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to create internal cart',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


