import { NextRequest, NextResponse } from 'next/server';
import { customerService, AddressInput } from '@/services/shopify/customer.service';
import { cookies } from 'next/headers';

const ACCESS_TOKEN_COOKIE = 'shopify_customer_access_token';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const address: AddressInput = await request.json();

    if (!address.address1 || !address.city || !address.country || !address.zip) {
      return NextResponse.json(
        { error: 'Address1, city, country, and zip are required' },
        { status: 400 }
      );
    }

    const result = await customerService.createAddress(accessToken, address);

    if (result.errors.length > 0) {
      return NextResponse.json(
        { error: result.errors[0], errors: result.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      address: result.address,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create address. Please try again.' },
      { status: 500 }
    );
  }
}

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

    const { addressId, ...address } = await request.json();

    if (!addressId) {
      return NextResponse.json(
        { error: 'Address ID is required' },
        { status: 400 }
      );
    }

    if (!address.address1 || !address.city || !address.country || !address.zip) {
      return NextResponse.json(
        { error: 'Address1, city, country, and zip are required' },
        { status: 400 }
      );
    }

    const result = await customerService.updateAddress(accessToken, addressId, address);

    if (result.errors.length > 0) {
      return NextResponse.json(
        { error: result.errors[0], errors: result.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      address: result.address,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update address. Please try again.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const addressId = searchParams.get('id');

    if (!addressId) {
      return NextResponse.json(
        { error: 'Address ID is required' },
        { status: 400 }
      );
    }

    const result = await customerService.deleteAddress(accessToken, addressId);

    if (result.errors.length > 0) {
      return NextResponse.json(
        { error: result.errors[0], errors: result.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete address. Please try again.' },
      { status: 500 }
    );
  }
}

