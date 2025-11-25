import { NextRequest, NextResponse } from 'next/server';
import { customerService } from '@/services/shopify/customer.service';
import { cookies } from 'next/headers';

const ACCESS_TOKEN_COOKIE = 'shopify_customer_access_token';
const TOKEN_EXPIRY_COOKIE = 'shopify_customer_token_expiry';

export async function POST(request: NextRequest) {
  try {
    const { resetUrl, password } = await request.json();

    if (!resetUrl || !password) {
      return NextResponse.json(
        { error: 'Reset URL and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const result = await customerService.resetPassword(resetUrl, password);

    if (result.errors.length > 0) {
      return NextResponse.json(
        { error: result.errors[0], errors: result.errors },
        { status: 400 }
      );
    }

    if (!result.customerAccessToken) {
      return NextResponse.json(
        { error: 'Failed to reset password' },
        { status: 500 }
      );
    }

    // Set httpOnly cookie for access token (auto-login after reset)
    const cookieStore = await cookies();
    cookieStore.set(ACCESS_TOKEN_COOKIE, result.customerAccessToken.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    cookieStore.set(TOKEN_EXPIRY_COOKIE, result.customerAccessToken.expiresAt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. You are now logged in.',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to reset password. Please try again.' },
      { status: 500 }
    );
  }
}

