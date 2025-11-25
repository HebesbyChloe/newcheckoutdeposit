import { NextRequest, NextResponse } from 'next/server';
import { cartService } from '@/services/shopify/cart.service';

// POST /api/cart/discount - Apply discount code
export async function POST(request: NextRequest) {
  try {
    const { cartId, discountCodes } = await request.json();

    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart ID is required' },
        { status: 400 }
      );
    }

    if (!discountCodes || !Array.isArray(discountCodes) || discountCodes.length === 0) {
      return NextResponse.json(
        { error: 'Discount codes array is required' },
        { status: 400 }
      );
    }

    const cart = await cartService.applyDiscountCode({ cartId, discountCodes });

    if (!cart) {
      return NextResponse.json(
        { error: 'Failed to apply discount code' },
        { status: 400 }
      );
    }

    return NextResponse.json({ cart });
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to apply discount code',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/cart/discount - Remove discount code
export async function DELETE(request: NextRequest) {
  try {
    const { cartId } = await request.json();

    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart ID is required' },
        { status: 400 }
      );
    }

    const cart = await cartService.removeDiscountCode(cartId);

    if (!cart) {
      return NextResponse.json(
        { error: 'Failed to remove discount code' },
        { status: 400 }
      );
    }

    return NextResponse.json({ cart });
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to remove discount code',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

