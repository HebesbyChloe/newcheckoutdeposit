import { NextRequest, NextResponse } from 'next/server';
import { customerService } from '@/services/shopify/customer.service';
import { cookies } from 'next/headers';

const ACCESS_TOKEN_COOKIE = 'shopify_customer_access_token';
const TOKEN_EXPIRY_COOKIE = 'shopify_customer_token_expiry';

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName, phone } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Normalize phone number - remove spaces, dashes, parentheses
    // Only send phone if it's provided and not empty
    let normalizedPhone = phone?.trim();
    if (normalizedPhone) {
      normalizedPhone = normalizedPhone.replace(/[\s\-\(\)]/g, '');
      // If phone doesn't start with +, don't send it (Shopify validation is strict)
      if (!normalizedPhone.startsWith('+')) {
        normalizedPhone = undefined;
      }
    }

    const result = await customerService.createCustomer({
      email,
      password,
      firstName,
      lastName,
      phone: normalizedPhone,
    });

    // Check if email verification is required (this is actually a success case)
    if (result.requiresVerification) {
      return NextResponse.json({
        success: true,
        requiresVerification: true,
        message: result.verificationMessage || 'Please check your email to verify your account.',
      });
    }

    if (result.errors.length > 0) {
      // Return the first error message (most specific)
      const errorMessage = result.errors[0];
      return NextResponse.json(
        { error: errorMessage, errors: result.errors },
        { status: 400 }
      );
    }

    if (!result.customer) {
      return NextResponse.json(
        { error: 'Failed to create customer account' },
        { status: 500 }
      );
    }

    // If verification is required, don't try to log in
    if (result.requiresVerification) {
      return NextResponse.json({
        success: true,
        requiresVerification: true,
        message: result.verificationMessage || 'Please check your email to verify your account.',
      });
    }

    // If customer data is available, account is active and we can log in
    if (result.customer) {
      // Get access token by logging in
      const accessToken = await customerService.createAccessToken(email, password);
      
      if (!accessToken) {
        return NextResponse.json(
          { error: 'Account created but failed to log in. Please try logging in.' },
          { status: 500 }
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
          id: result.customer.id,
          email: result.customer.email,
          firstName: result.customer.firstName,
          lastName: result.customer.lastName,
        },
      });
    }

    // Account created but customer data not available (likely disabled/verification required)
    return NextResponse.json({
      success: true,
      requiresVerification: true,
      message: 'Account created successfully. Please check your email to verify your account before logging in.',
    });
  } catch (error) {
    // Don't log full error as it may contain sensitive data
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Remove any password references from error messages
    const safeErrorMessage = errorMessage.replace(/password[^,}]*/gi, '[REDACTED]');
    return NextResponse.json(
      { 
        error: 'Failed to register. Please try again.'
      },
      { status: 500 }
    );
  }
}

