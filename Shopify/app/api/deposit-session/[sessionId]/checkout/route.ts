import { NextRequest, NextResponse } from 'next/server';
import { partialPaymentService } from '@/services/shopify/partial-payment.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> | { sessionId: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params;
    const sessionId = resolvedParams.sessionId;

    if (!sessionId) {
      return NextResponse.json(
        {
          error: 'Session ID is required',
        },
        { status: 400 }
      );
    }

    // Create checkout for deposit
    const result = await partialPaymentService.createDepositCheckout(sessionId);

    if (result.error || !result.checkoutUrl) {
      return NextResponse.json(
        {
          error: 'Failed to create checkout',
          details: result.error || 'Unknown error',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      checkout_url: result.checkoutUrl,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error creating deposit checkout:', error);
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

