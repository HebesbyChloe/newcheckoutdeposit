import { NextRequest, NextResponse } from 'next/server';
import { partialPaymentService } from '@/services/shopify/partial-payment.service';
import { validateDepositSessionRequest } from '@/utils/validation/partial-payment';
import { DepositSessionCreateRequest } from '@/types/partial-payment.types';

export async function POST(request: NextRequest) {
  try {
    const body: DepositSessionCreateRequest = await request.json();

    // Validate request
    const validation = validateDepositSessionRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // Create deposit session
    const result = await partialPaymentService.createDepositSession(body);

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
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error creating deposit session:', error);
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

