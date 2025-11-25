import { NextRequest, NextResponse } from 'next/server';
import { customerService } from '@/services/shopify/customer.service';
import { cookies } from 'next/headers';

const ACCESS_TOKEN_COOKIE = 'shopify_customer_access_token';
const TOKEN_EXPIRY_COOKIE = 'shopify_customer_token_expiry';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const accessToken = await customerService.createAccessToken(email, password);

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Get customer data
    const customer = await customerService.getCustomer(accessToken.accessToken);

    if (!customer) {
      // Customer query returns null for disabled accounts (email verification required)
      // Access token is valid, but account needs to be activated
      return NextResponse.json(
        { 
          error: 'Your account requires email verification. Please check your email and click the verification link before logging in.',
          requiresVerification: true
        },
        { status: 403 }
      );
    }

    // Set httpOnly cookie for access token
    const cookieStore = await cookies();
    cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    cookieStore.set(TOKEN_EXPIRY_COOKIE, accessToken.expiresAt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
      },
    });
  } catch (error) {
    // Don't log full error as it may contain sensitive data
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Remove any password references from error messages
    const safeErrorMessage = errorMessage.replace(/password[^,}]*/gi, '[REDACTED]');
    return NextResponse.json(
      { 
        error: 'Failed to log in. Please check your credentials and try again.'
      },
      { status: 500 }
    );
  }
}

