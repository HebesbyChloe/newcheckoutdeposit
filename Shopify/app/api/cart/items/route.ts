import { NextRequest, NextResponse } from 'next/server';
import { cartService } from '@/services/shopify/cart.service';

// POST /api/cart/items - Add items to cart
export async function POST(request: NextRequest) {
  try {
    const { cartId, lines } = await request.json();

    if (process.env.NODE_ENV !== 'production') {
      console.log('POST /api/cart/items - Request:', { cartId, lines });
    }

    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart ID is required' },
        { status: 400 }
      );
    }

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { error: 'Lines array is required' },
        { status: 400 }
      );
    }

    const cart = await cartService.addLinesToCart(cartId, lines);

    if (!cart) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('POST /api/cart/items - addLinesToCart returned null');
      }
      return NextResponse.json(
        { error: 'Failed to add items to cart. Please check server logs for details.' },
        { status: 500 }
      );
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('POST /api/cart/items - Success:', {
        cartId: cart.id,
        linesCount: cart.lines?.length || 0,
        totalQuantity: cart.totalQuantity,
      });
    }

    return NextResponse.json({ cart });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Exception in POST /api/cart/items:', error);
    }
    return NextResponse.json(
      { 
        error: 'Failed to add items to cart',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/cart/items - Update cart items
export async function PUT(request: NextRequest) {
  try {
    const { cartId, lines } = await request.json();

    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart ID is required' },
        { status: 400 }
      );
    }

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { error: 'Lines array is required' },
        { status: 400 }
      );
    }

    const cart = await cartService.updateCartLines({ cartId, lines });

    if (!cart) {
      return NextResponse.json(
        { error: 'Failed to update cart items' },
        { status: 400 }
      );
    }

    return NextResponse.json({ cart });
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to update cart items',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/cart/items - Remove cart items
export async function DELETE(request: NextRequest) {
  try {
    const { cartId, lineIds } = await request.json();

    if (process.env.NODE_ENV !== 'production') {
      console.log('DELETE /api/cart/items - Request:', { cartId, lineIds });
    }

    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart ID is required' },
        { status: 400 }
      );
    }

    if (!lineIds || !Array.isArray(lineIds) || lineIds.length === 0) {
      return NextResponse.json(
        { error: 'Line IDs array is required' },
        { status: 400 }
      );
    }

    try {
    const cart = await cartService.removeCartLines({ cartId, lineIds });

    // Check if cart doesn't exist (expired or invalid)
    if (cart && (cart as any).__cartNotFound) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('DELETE /api/cart/items - Cart does not exist in Shopify (may have expired)');
      }
      return NextResponse.json(
        { 
          error: 'Cart not found. The cart may have expired. Please refresh and try again.',
          cartNotFound: true 
        },
        { status: 404 }
      );
    }

    if (!cart) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('DELETE /api/cart/items - removeCartLines returned null');
      }
      return NextResponse.json(
        { error: 'Failed to remove cart items. The item may have already been removed or the cart ID is invalid.' },
        { status: 400 }
      );
    }

      if (process.env.NODE_ENV !== 'production') {
        console.log('DELETE /api/cart/items - Success:', {
          cartId: cart.id,
          linesCount: cart.lines?.length || 0,
          totalQuantity: cart.totalQuantity,
        });
      }

      return NextResponse.json({ cart });
    } catch (innerError) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('DELETE /api/cart/items - Inner error:', innerError);
      }
      return NextResponse.json(
        { 
          error: 'Failed to remove cart items',
          message: innerError instanceof Error ? innerError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Exception in DELETE /api/cart/items:', error);
      if (error instanceof Error) {
        console.error('Error stack:', error.stack);
      }
    }
    return NextResponse.json(
      { 
        error: 'Failed to remove cart items',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

