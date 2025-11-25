import { NextRequest, NextResponse } from 'next/server';
import { customerService } from '@/services/shopify/customer.service';
import { cookies } from 'next/headers';

const ACCESS_TOKEN_COOKIE = 'shopify_customer_access_token';
const TOKEN_EXPIRY_COOKIE = 'shopify_customer_token_expiry';

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { firstName, lastName, email, phone } = await request.json();

    const result = await customerService.updateCustomer(accessToken, {
      firstName,
      lastName,
      email,
      phone,
    });

    if (result.errors.length > 0) {
      return NextResponse.json(
        { error: result.errors[0], errors: result.errors },
        { status: 400 }
      );
    }

    // Update access token if a new one was provided
    if (result.newAccessToken && result.newAccessToken !== accessToken) {
      cookieStore.set(ACCESS_TOKEN_COOKIE, result.newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      });
    }

    return NextResponse.json({
      success: true,
      customer: result.customer,
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to update profile',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

