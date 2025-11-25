import { NextRequest, NextResponse } from 'next/server';
import { customerService } from '@/services/shopify/customer.service';
import { cookies } from 'next/headers';

const ACCESS_TOKEN_COOKIE = 'shopify_customer_access_token';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const customer = await customerService.getCustomer(accessToken);

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ customer });
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to fetch customer data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

