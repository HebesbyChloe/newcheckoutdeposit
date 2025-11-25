import { NextRequest, NextResponse } from 'next/server';
import { internalCartStorage } from '@/lib/storage/cart-storage';
import { InternalCart, InternalCartItem } from '@/types/internal-cart.types';
import { Cart } from '@/types/api.types';
import { transformInternalCartToCart } from '../transform';
import { externalCartService } from '@/services/shopify/external-cart.service';

// Helper to build a new internal cart item
function createInternalCartItem(input: {
  source: 'shopify' | 'external';
  variantId?: string;
  externalId?: string;
  productHandle?: string;
  title: string;
  imageUrl: string;
  quantity: number;
  price: { amount: string; currencyCode: string };
  attributes?: Array<{ key: string; value: string }>;
  payload?: Record<string, any>;
}): InternalCartItem {
  return {
    id: `line_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
    source: input.source,
    variantId: input.variantId,
    externalId: input.externalId,
    productHandle: input.productHandle,
    title: input.title,
    imageUrl: input.imageUrl,
    quantity: input.quantity,
    price: input.price,
    attributes: input.attributes,
    payload: input.payload,
  };
}

// POST /api/internal-cart/items - Add item to internal cart
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { cartId, source, variantId, externalId, productHandle, title, imageUrl, quantity, price, attributes, payload } = body;

    if (!source || (source !== 'shopify' && source !== 'external')) {
      return NextResponse.json(
        { error: 'Invalid or missing source (must be "shopify" or "external")' },
        { status: 400 }
      );
    }

    if (!title || !imageUrl || !price?.amount || !price?.currencyCode) {
      return NextResponse.json(
        { error: 'Missing required item fields (title, imageUrl, price)' },
        { status: 400 }
      );
    }

    if (!quantity || quantity <= 0) {
      quantity = 1;
    }

    // Ensure we have a cart
    let cart: InternalCart | null = null;
    if (cartId) {
      cart = internalCartStorage.getCart(cartId);
    }

    if (!cart) {
      const newCartId = internalCartStorage.generateCartId();
      cart = internalCartStorage.createCart(newCartId, {
        items: [],
      });
      cartId = newCartId;
    }

    // For external diamonds, enforce one-per-cart and ensure Shopify variant exists early
    if (source === 'external') {
      const externalIdFromAttrs =
        (attributes || []).find(
          (a: { key: string; value: string }) => a.key === '_external_id'
        )?.value || undefined;

      const effectiveExternalId = externalId || externalIdFromAttrs;

      if (!effectiveExternalId) {
        return NextResponse.json(
          { error: 'externalId or _external_id attribute is required for external items' },
          { status: 400 }
        );
      }

      // Prevent adding same diamond twice to the same cart
      const alreadyInCart = cart.items.some((item) => {
        if (item.source !== 'external') return false;
        const itemExternalId =
          item.externalId ||
          item.attributes?.find((a) => a.key === '_external_id')?.value;
        return itemExternalId === effectiveExternalId;
      });

      if (alreadyInCart) {
        return NextResponse.json(
          {
            error:
              'This diamond is already in your cart and is currently on hold.',
          },
          { status: 400 }
        );
      }

      // Determine source type (labgrown / natural) from attributes, default labgrown
      const sourceTypeAttr = (attributes || []).find(
        (a: { key: string; value: string }) => a.key === '_source_type'
      )?.value;
      const sourceType = (sourceTypeAttr === 'natural' ? 'natural' : 'labgrown') as
        | 'labgrown'
        | 'natural';

      // Prepare numeric price
      const priceNumber = parseFloat(price.amount);
      if (Number.isNaN(priceNumber) || priceNumber <= 0) {
        return NextResponse.json(
          { error: 'Invalid price for external item' },
          { status: 400 }
        );
      }

      // 1) Ensure dummy product exists
      let { productId, error } = await externalCartService.findDummyProduct(
        sourceType
      );

      if (!productId) {
        const created = await externalCartService.createDummyProduct(sourceType);
        productId = created.productId;
        error = created.error;
      }

      if (!productId || error) {
        return NextResponse.json(
          {
            error:
              error ||
              `Failed to prepare dummy product for external diamond ${effectiveExternalId}`,
          },
          { status: 500 }
        );
      }

      // 2) Ensure variant exists for this external diamond
      const variantResult = await externalCartService.findOrCreateVariant(
        productId,
        effectiveExternalId,
        priceNumber,
        title,
        imageUrl,
        payload
      );

      if (!variantResult.variantId || variantResult.error) {
        return NextResponse.json(
          {
            error:
              variantResult.error ||
              `Failed to prepare variant for external diamond ${effectiveExternalId}`,
          },
          { status: 500 }
        );
      }

      // Use the resolved variantId for this internal cart item
      variantId = variantResult.variantId;
      externalId = effectiveExternalId;
    }

    const item = createInternalCartItem({
      source,
      variantId,
      externalId,
      productHandle,
      title,
      imageUrl,
      quantity,
      price,
      attributes,
      payload,
    });

    const updatedCart = internalCartStorage.addItem(cart, item);
    const cartView: Cart = transformInternalCartToCart(updatedCart);

    return NextResponse.json({ cartId: updatedCart.id, cart: cartView });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to add item to internal cart',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// PUT /api/internal-cart/items - Update quantity
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { cartId, lineId, quantity } = body;

    if (!cartId || !lineId) {
      return NextResponse.json(
        { error: 'cartId and lineId are required' },
        { status: 400 }
      );
    }

    const cart = internalCartStorage.getCart(cartId);
    if (!cart) {
      return NextResponse.json(
        { error: 'Cart not found' },
        { status: 404 }
      );
    }

    const items = cart.items.map((item) =>
      item.id === lineId
        ? {
            ...item,
            quantity: quantity <= 0 ? 0 : quantity,
          }
        : item
    ).filter((item) => item.quantity > 0);

    const updatedCart = internalCartStorage.saveCart({ ...cart, items });
    const cartView: Cart = transformInternalCartToCart(updatedCart);

    return NextResponse.json({ cartId: updatedCart.id, cart: cartView });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to update internal cart item',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/internal-cart/items - Remove item
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { cartId, lineId } = body;

    if (!cartId || !lineId) {
      return NextResponse.json(
        { error: 'cartId and lineId are required' },
        { status: 400 }
      );
    }

    const cart = internalCartStorage.getCart(cartId);
    if (!cart) {
      return NextResponse.json(
        { error: 'Cart not found' },
        { status: 404 }
      );
    }

    const items = cart.items.filter((item) => item.id !== lineId);
    const updatedCart = internalCartStorage.saveCart({ ...cart, items });
    const cartView: Cart = transformInternalCartToCart(updatedCart);

    return NextResponse.json({ cartId: updatedCart.id, cart: cartView });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to remove internal cart item',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


