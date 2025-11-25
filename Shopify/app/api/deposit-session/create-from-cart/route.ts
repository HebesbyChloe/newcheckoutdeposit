import { NextRequest, NextResponse } from 'next/server';
import { partialPaymentService } from '@/services/shopify/partial-payment.service';
import {
  buildShopifyLinesFromInternalCart,
  buildShopifyLinesFromCartSnapshot,
} from '@/lib/internal-cart/shopify-lines';
import { DepositSessionCreateRequest } from '@/types/partial-payment.types';
import { Cart } from '@/types/api.types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const cartId = body?.cartId as string | undefined;
    const customerId = body?.customer_id as string | undefined;
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

    const totalAmount = buildResult.totalAmount;
    const depositAmount = Math.max(totalAmount * 0.3, 50);

    const depositRequest: DepositSessionCreateRequest = {
      customer_id: customerId,
      items: buildResult.lines.map((line) => ({
        variantId: line.merchandiseId,
        quantity: line.quantity,
      })),
      total_amount: totalAmount,
      deposit_amount: depositAmount,
    };

    const result = await partialPaymentService.createDepositSession(
      depositRequest
    );

    if (result.error || !result.session) {
      return NextResponse.json(
        {
          error: 'Failed to create deposit session',
          details: result.error || 'Unknown error',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      deposit_session_url: `/deposit-session/${result.session.session_id}`,
      session_id: result.session.session_id,
    });
  } catch (error) {
    console.error('Error in POST /api/deposit-session/create-from-cart:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


