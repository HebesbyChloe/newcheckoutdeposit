import { NextRequest, NextResponse } from 'next/server';
import { depositSessionStorage } from '@/lib/storage/deposit-sessions';
import { DepositSession } from '@/types/partial-payment.types';

export async function GET(
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

    const session = depositSessionStorage.getSession(sessionId) as DepositSession | null;

    if (!session) {
      return NextResponse.json(
        {
          error: 'Session not found or expired',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      session,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error fetching deposit session:', error);
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

