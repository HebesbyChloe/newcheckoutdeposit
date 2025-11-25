import { NextRequest, NextResponse } from 'next/server';
import { customerService } from '@/services/shopify/customer.service';
import { cookies } from 'next/headers';

const ACCESS_TOKEN_COOKIE = 'shopify_customer_access_token';
const TOKEN_EXPIRY_COOKIE = 'shopify_customer_token_expiry';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

    if (accessToken) {
      await customerService.deleteAccessToken(accessToken);
    }

    // Clear cookies
    cookieStore.delete(ACCESS_TOKEN_COOKIE);
    cookieStore.delete(TOKEN_EXPIRY_COOKIE);

    return NextResponse.json({ success: true });
  } catch (error) {
    // Still clear cookies even if API call fails
    const cookieStore = await cookies();
    cookieStore.delete(ACCESS_TOKEN_COOKIE);
    cookieStore.delete(TOKEN_EXPIRY_COOKIE);

    return NextResponse.json({ success: true });
  }
}

