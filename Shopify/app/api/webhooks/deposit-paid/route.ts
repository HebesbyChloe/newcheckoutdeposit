import { NextRequest, NextResponse } from 'next/server';
import { partialPaymentService } from '@/services/shopify/partial-payment.service';
import { verifyShopifyWebhook, getRawBody } from '@/utils/webhooks/shopify-verification';
import { depositSessionStorage } from '@/lib/storage/deposit-sessions';

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const hmacHeader = request.headers.get('x-shopify-hmac-sha256');
    const rawBody = await getRawBody(request);

    if (!verifyShopifyWebhook(rawBody, hmacHeader)) {
      return NextResponse.json(
        {
          error: 'Invalid webhook signature',
        },
        { status: 401 }
      );
    }

    const webhookData = JSON.parse(rawBody);

    // Extract session ID from webhook data
    // This depends on how you structure the webhook - you might need to adjust
    // For now, we'll look for session_id in custom attributes or order tags
    let sessionId: string | null = null;

    if (webhookData.order) {
      // Check custom attributes
      const sessionAttr = webhookData.order.custom_attributes?.find(
        (attr: any) => attr.key === 'session_id'
      );
      if (sessionAttr) {
        sessionId = sessionAttr.value;
      }

      // Or check tags
      if (!sessionId && webhookData.order.tags) {
        const sessionTag = webhookData.order.tags.find((tag: string) => tag.startsWith('session:'));
        if (sessionTag) {
          sessionId = sessionTag.replace('session:', '');
        }
      }
    }

    if (!sessionId) {
      return NextResponse.json(
        {
          error: 'Session ID not found in webhook data',
        },
        { status: 400 }
      );
    }

    // Complete deposit order
    const result = await partialPaymentService.completeDepositOrder(sessionId);

    if (result.error || !result.orderId) {
      return NextResponse.json(
        {
          error: 'Failed to complete deposit order',
          details: result.error || 'Unknown error',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      redirect_url: `/partial-payment/${result.orderId}`,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error processing deposit paid webhook:', error);
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

