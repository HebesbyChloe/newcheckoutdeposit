import { NextRequest, NextResponse } from 'next/server';
import { externalCartService } from '@/services/shopify/external-cart.service';

/**
 * Test endpoint that simulates the full external cart flow
 * Usage: GET /api/test-external-cart-full?source_type=labgrown
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sourceType = (searchParams.get('source_type') || 'labgrown') as 'labgrown' | 'natural';
    const externalId = searchParams.get('external_id') || `TEST-${Date.now()}`;
    const price = parseFloat(searchParams.get('price') || '500.00');

    const steps: any[] = [];
    let currentStep = '';

    // Step 1: Find dummy product
    currentStep = 'Finding dummy product';
    steps.push({ step: currentStep, status: 'in_progress' });
    const findResult = await externalCartService.findDummyProduct(sourceType);
    steps.push({
      step: currentStep,
      status: findResult.error ? 'error' : findResult.productId ? 'success' : 'not_found',
      result: {
        productId: findResult.productId,
        error: findResult.error,
      },
    });

    if (findResult.error) {
      return NextResponse.json({
        success: false,
        steps,
        error: 'Failed at step: ' + currentStep,
      });
    }

    let productId = findResult.productId;

    // Step 2: Create product if not found
    if (!productId) {
      currentStep = 'Creating dummy product';
      steps.push({ step: currentStep, status: 'in_progress' });
      const createResult = await externalCartService.createDummyProduct(sourceType);
      steps.push({
        step: currentStep,
        status: createResult.error ? 'error' : createResult.productId ? 'success' : 'failed',
        result: {
          productId: createResult.productId,
          error: createResult.error,
        },
      });

      if (createResult.error || !createResult.productId) {
        return NextResponse.json({
          success: false,
          steps,
          error: 'Failed at step: ' + currentStep,
        });
      }
      productId = createResult.productId;
    }

    // Step 3: Find or create variant
    currentStep = 'Finding or creating variant';
    steps.push({ step: currentStep, status: 'in_progress' });
    const variantResult = await externalCartService.findOrCreateVariant(
      productId!,
      externalId,
      price,
      'Test Diamond',
      undefined,
      { test: true }
    );
    steps.push({
      step: currentStep,
      status: variantResult.error ? 'error' : variantResult.variantId ? 'success' : 'failed',
      result: {
        variantId: variantResult.variantId,
        error: variantResult.error,
      },
    });

    if (variantResult.error || !variantResult.variantId) {
      return NextResponse.json({
        success: false,
        steps,
        error: 'Failed at step: ' + currentStep,
        details: variantResult.error,
      });
    }

    // Step 4: Add to cart
    currentStep = 'Adding variant to cart';
    steps.push({ step: currentStep, status: 'in_progress' });
    const cartResult = await externalCartService.addVariantToCart(variantResult.variantId);
    steps.push({
      step: currentStep,
      status: cartResult.error ? 'error' : cartResult.checkoutUrl ? 'success' : 'failed',
      result: {
        checkoutUrl: cartResult.checkoutUrl,
        error: cartResult.error,
      },
    });

    return NextResponse.json({
      success: !cartResult.error && !!cartResult.checkoutUrl,
      steps,
      finalResult: {
        productId,
        variantId: variantResult.variantId,
        checkoutUrl: cartResult.checkoutUrl,
      },
      error: cartResult.error,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV !== 'production' ? (error instanceof Error ? error.stack : undefined) : undefined,
      },
      { status: 500 }
    );
  }
}

