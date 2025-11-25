import { NextRequest, NextResponse } from 'next/server';
import { cartService } from '@/services/shopify/cart.service';

// GET /api/cart - Get cart by ID
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    let cartId = searchParams.get('id');

    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart ID is required' },
        { status: 400 }
      );
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('GET /api/cart - cartId:', cartId);
    }

    const cart = await cartService.getCart(cartId);

    if (!cart) {
      return NextResponse.json(
        { error: 'Cart not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ cart });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch cart',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/cart - Create new cart
export async function POST(request: NextRequest) {
  try {
    const { variantId, quantity = 1 } = await request.json();

    if (!variantId) {
      return NextResponse.json(
        { error: 'Variant ID is required' },
        { status: 400 }
      );
    }

    const result = await cartService.createCart({ variantId, quantity });

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Return cart if available (cartCreate now returns full cart)
    if (result.cartId) {
      // If cart is already in result, use it; otherwise fetch it
      const cart = result.cart || await cartService.getCart(result.cartId);
      return NextResponse.json({
        cartId: result.cartId,
        checkoutUrl: result.checkoutUrl,
        cart,
      });
    }

    return NextResponse.json(
      { error: 'Failed to create cart' },
      { status: 500 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to create cart',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

