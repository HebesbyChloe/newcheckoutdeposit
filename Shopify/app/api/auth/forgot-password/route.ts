import { NextRequest, NextResponse } from 'next/server';
import { customerService } from '@/services/shopify/customer.service';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const result = await customerService.recoverPassword(email);

    // Always return success for security (don't reveal if email exists)
    // This prevents email enumeration attacks
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process password reset request. Please try again.' },
      { status: 500 }
    );
  }
}

