import { NextRequest, NextResponse } from 'next/server';
import { adminOrderService } from '@/services/shopify/admin/order.service';
import { metafieldService } from '@/services/shopify/admin/metafield.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> | { orderId: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params;
    const orderId = resolvedParams.orderId;

    if (!orderId) {
      return NextResponse.json(
        {
          error: 'Order ID is required',
        },
        { status: 400 }
      );
    }

    // Get order
    const orderResult = await adminOrderService.getOrder(orderId);

    if (orderResult.error || !orderResult.order) {
      return NextResponse.json(
        {
          error: orderResult.error || 'Order not found',
        },
        { status: 404 }
      );
    }

    // Extract partial payment metafields
    const metafields = orderResult.order.metafields;
    const depositAmount = parseFloat(
      metafields.find((mf) => mf.namespace === 'partial' && mf.key === 'deposit_amount')?.value || '0'
    );
    const remainingAmount = parseFloat(
      metafields.find((mf) => mf.namespace === 'partial' && mf.key === 'remaining_amount')?.value || '0'
    );
    const depositPaid =
      metafields.find((mf) => mf.namespace === 'partial' && mf.key === 'deposit_paid')?.value === 'true';
    const remainingPaid =
      metafields.find((mf) => mf.namespace === 'partial' && mf.key === 'remaining_paid')?.value === 'true';
    const paymentStatus =
      metafields.find((mf) => mf.namespace === 'partial' && mf.key === 'payment_status')?.value ||
      'pending_deposit';
    const paymentLink = metafields.find((mf) => mf.namespace === 'partial' && mf.key === 'payment_link')?.value;

    return NextResponse.json({
      order: orderResult.order,
      depositAmount,
      remainingAmount,
      depositPaid,
      remainingPaid,
      paymentStatus,
      paymentLink,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error fetching order:', error);
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

