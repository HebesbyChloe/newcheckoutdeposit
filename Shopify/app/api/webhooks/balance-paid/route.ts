import { NextRequest, NextResponse } from 'next/server';
import { partialPaymentService } from '@/services/shopify/partial-payment.service';
import { verifyShopifyWebhook, getRawBody } from '@/utils/webhooks/shopify-verification';

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

    // Extract order ID from webhook data
    let orderId: string | null = null;

    if (webhookData.order) {
      orderId = webhookData.order.id || webhookData.order.admin_graphql_api_id;
    } else if (webhookData.id) {
      orderId = webhookData.id;
    }

    if (!orderId) {
      return NextResponse.json(
        {
          error: 'Order ID not found in webhook data',
        },
        { status: 400 }
      );
    }

    // Extract transaction ID if available
    const transactionId = webhookData.id || webhookData.transaction?.id || undefined;

    // Complete remaining payment
    const result = await partialPaymentService.completeRemainingPayment(orderId, transactionId);

    if (result.error || !result.success) {
      return NextResponse.json(
        {
          error: 'Failed to complete remaining payment',
          details: result.error || 'Unknown error',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      orderId,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error processing balance paid webhook:', error);
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

