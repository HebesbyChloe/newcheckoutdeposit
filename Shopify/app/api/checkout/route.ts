import { NextRequest, NextResponse } from 'next/server';
import { cartService } from '@/services/shopify/cart.service';
import {
  buildShopifyLinesFromInternalCart,
  buildShopifyLinesFromCartSnapshot,
} from '@/lib/internal-cart/shopify-lines';
import { Cart } from '@/types/api.types';
import { shopifyClient } from '@/lib/shopify';

async function waitForVariantsAvailable(
  variantIds: string[],
  maxAttempts = 4,
  delayMs = 1500
): Promise<{ ok: boolean; unavailableIds: string[] }> {
  if (variantIds.length === 0) {
    return { ok: true, unavailableIds: [] };
  }

  const uniqueIds = Array.from(new Set(variantIds));
  const query = `
    query CheckVariantAvailability($ids: [ID!]!) {
      nodes(ids: $ids) {
        __typename
        ... on ProductVariant {
          id
          availableForSale
          quantityAvailable
        }
      }
    }
  `;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const data = await shopifyClient.request<{
        nodes: Array<{
          __typename?: string;
          id?: string;
          availableForSale?: boolean | null;
          quantityAvailable?: number | null;
        } | null>;
      }>(query, { ids: uniqueIds });

      const unavailable: string[] = [];

      data.nodes.forEach((node, index) => {
        const id = uniqueIds[index];
        if (!node || node.__typename !== 'ProductVariant') {
          unavailable.push(id);
          return;
        }
        const available = node.availableForSale ?? false;
        const qty = node.quantityAvailable;
        if (!available || (typeof qty === 'number' && qty <= 0)) {
          unavailable.push(id);
        }
      });

      if (unavailable.length === 0) {
        return { ok: true, unavailableIds: [] };
      }

      if (attempt < maxAttempts) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            'Some variants not yet available in Storefront, retrying...',
            { attempt, unavailable }
          );
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      return { ok: false, unavailableIds: unavailable };
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error checking variant availability before checkout:', error);
      }
      // On API error, fall back to trying checkout; don't block forever
      return { ok: true, unavailableIds: [] };
    }
  }

  return { ok: true, unavailableIds: [] };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const cartId = body?.cartId as string | undefined;
    const cartSnapshot = body?.cart as Cart | undefined;

    if (!cartId && !cartSnapshot) {
      return NextResponse.json(
        { error: 'cartId or cart snapshot is required' },
        { status: 400 }
      );
    }

    let buildResult =
      cartId != null
        ? await buildShopifyLinesFromInternalCart(cartId)
        : { lines: [], totalAmount: 0, currencyCode: 'USD', error: 'no-id' };

    // Fallback: if internal cart is missing but we have a snapshot from client
    if (
      buildResult.error === 'Internal cart not found or expired' &&
      cartSnapshot
    ) {
      buildResult = await buildShopifyLinesFromCartSnapshot(cartSnapshot);
    }

    if (buildResult.error) {
      return NextResponse.json(
        { error: buildResult.error },
        { status: 400 }
      );
    }

    if (buildResult.lines.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400 }
      );
    }

    // Pre-flight check: ensure variants are available in Storefront to avoid
    // Shopify removing them as "out of stock" right after redirect.
    const variantIds = buildResult.lines.map((l) => l.merchandiseId);
    const availability = await waitForVariantsAvailable(variantIds);

    if (!availability.ok) {
      return NextResponse.json(
        {
          error:
            'Some diamonds are no longer available or not yet ready for checkout. Please review your cart.',
          unavailableVariantIds: availability.unavailableIds,
        },
        { status: 409 }
      );
    }

    const cartResult = await cartService.createCartWithLines({
      lines: buildResult.lines,
    });

    if (cartResult.error || !cartResult.checkoutUrl) {
      return NextResponse.json(
        {
          error: cartResult.error || 'Failed to create Shopify checkout cart',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      checkoutUrl: cartResult.checkoutUrl,
    });
  } catch (error) {
    console.error('Error in POST /api/checkout:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


