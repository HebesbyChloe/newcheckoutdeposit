import { NextRequest, NextResponse } from 'next/server';
import { externalCartService } from '@/services/shopify/external-cart.service';
import { validateExternalCartRequest } from '@/utils/validation/external-cart';
import { ExternalCartAddRequest } from '@/types/external-cart.types';

export async function POST(request: NextRequest) {
  try {
    const body: ExternalCartAddRequest & { 
      cartId?: string;
      existingCartLines?: Array<{
        merchandiseId: string;
        quantity: number;
        attributes?: Array<{ key: string; value: string }>;
      }>;
    } = await request.json();
    const { cartId: rawCartId, existingCartLines, ...externalCartRequest } = body;

    // Clean cart ID (remove query parameters like ?key=...)
    const cleanCartId = (id: string): string => {
      return id.includes('?') ? id.split('?')[0] : id;
    };
    
    const cartId = rawCartId ? cleanCartId(rawCartId) : undefined;

    if (process.env.NODE_ENV !== 'production') {
      console.log('External cart add - cartId:', {
        raw: rawCartId,
        cleaned: cartId,
        hasQueryParams: rawCartId?.includes('?') || false,
      });
    }

    // Validate request
    const validation = validateExternalCartRequest(externalCartRequest);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // Find or create dummy product
    let productId: string | null = null;

    // Try to find existing dummy product
    const findResult = await externalCartService.findDummyProduct(externalCartRequest.source_type);
    if (findResult.error) {
      return NextResponse.json(
        {
          error: 'Failed to find dummy product',
          details: findResult.error,
        },
        { status: 500 }
      );
    }

    if (findResult.productId) {
      productId = findResult.productId;

      // Ensure existing product is published to Online Store
      // (products created before publishing logic was added may not be published)
      const { adminProductService } = await import('@/services/shopify/admin/product.service');
      const publishResult = await adminProductService.publishProductToOnlineStore(productId);
      if (!publishResult.success && process.env.NODE_ENV !== 'production') {
        console.warn('Failed to publish existing product to Online Store:', publishResult.error);
      } else if (process.env.NODE_ENV !== 'production') {
        console.log('Ensured existing product is published to Online Store');
      }
    } else {
      // Create new dummy product
      if (process.env.NODE_ENV !== 'production') {
        console.log('Creating dummy product for source_type:', externalCartRequest.source_type);
      }

      const createResult = await externalCartService.createDummyProduct(externalCartRequest.source_type);

      if (process.env.NODE_ENV !== 'production') {
        console.log('Dummy product creation result:', {
          source_type: externalCartRequest.source_type,
          error: createResult.error,
          productId: createResult.productId,
        });
      }

      if (createResult.error || !createResult.productId) {
        // Enhanced error logging
        if (process.env.NODE_ENV !== 'production') {
          console.error('Dummy product creation failed:', {
            source_type: externalCartRequest.source_type,
            error: createResult.error,
            productId: createResult.productId,
          });
        }
        return NextResponse.json(
          {
            error: 'Failed to create dummy product',
            details: createResult.error || 'Unknown error',
            source_type: externalCartRequest.source_type,
          },
          { status: 500 }
        );
      }
      productId = createResult.productId;
    }

    // Find or create variant
    if (process.env.NODE_ENV !== 'production') {
      console.log('Finding or creating variant:', {
        productId,
        external_id: externalCartRequest.external_id,
        price: externalCartRequest.price,
      });
    }

    const variantResult = await externalCartService.findOrCreateVariant(
      productId,
      externalCartRequest.external_id,
      externalCartRequest.price,
      externalCartRequest.title,
      externalCartRequest.image,
      externalCartRequest.payload
    );

    if (variantResult.error || !variantResult.variantId) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Variant creation failed:', {
          productId,
          external_id: externalCartRequest.external_id,
          error: variantResult.error,
          variantId: variantResult.variantId,
        });
      }
      return NextResponse.json(
        {
          error: 'Failed to find or create variant',
          details: variantResult.error || 'Unknown error',
          productId,
          external_id: externalCartRequest.external_id,
        },
        { status: 500 }
      );
    }

    // Extract diamond metadata from payload for cart line attributes
    const extractMetadata = (payload?: Record<string, any>, imageUrl?: string, itemId?: string) => {
      const getField = (keys: string[]) => {
        for (const key of keys) {
          const value = payload?.[key] || payload?.[key.toLowerCase()] || payload?.[key.toUpperCase()];
          if (value) return String(value);
        }
        return undefined;
      };

      return {
        carat: getField(['carat', 'Carat', 'CARAT', 'diamond_carat', 'Diamond Carat']),
        color: getField(['color', 'Color', 'COLOR', 'diamond_color', 'Diamond Color']),
        clarity: getField(['clarity', 'Clarity', 'CLARITY', 'diamond_clarity', 'Diamond Clarity']),
        cutGrade: getField(['cut_grade', 'Cut Grade', 'Cut_Grade', 'cutGrade', 'CutGrade', 'CUT_GRADE']),
        certificateType: getField(['certificate_type', 'Certificate Type', 'Certificate_Type', 'certificateType', 'grading_lab', 'Grading Lab', 'Grading_Lab', 'gradingLab', 'certification', 'Certification']),
        certificateNumber: getField(['certificate_number', 'Certificate Number', 'Certificate_Number', 'certificateNumber', 'certificate_no', 'Certificate No', 'certificateNo', 'cert_number', 'Cert Number']),
        gradingLab: getField(['grading_lab', 'Grading Lab', 'Grading_Lab', 'gradingLab', 'Grading_Lab', 'lab', 'Lab', 'LAB']),
        imageUrl: imageUrl || getField(['image_url', 'imageUrl', 'Image URL', 'Image_Path', 'image', 'Image', 'photo', 'Photo', 'picture', 'Picture', 'still_image_url', 'stillImageUrl', 'Still Image URL']),
        itemId: itemId || getField(['item_id', 'itemId', 'Item ID #', 'Item ID', 'id', 'ID']),
      };
    };

    if (process.env.NODE_ENV !== 'production') {
      console.log('External cart add - payload received:', {
        hasPayload: !!externalCartRequest.payload,
        payloadType: typeof externalCartRequest.payload,
        payloadKeys: externalCartRequest.payload ? Object.keys(externalCartRequest.payload) : [],
        payload: externalCartRequest.payload,
      });
    }
    
    const metadata = extractMetadata(externalCartRequest.payload, externalCartRequest.image, externalCartRequest.external_id);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('External cart add - extracted metadata:', metadata);
    }
    
    const attributes: Array<{ key: string; value: string }> = [];

    // Hidden unique key for external feed items so Shopify treats each diamond as a separate line
    // and we can trace it back to the external feed
    if (externalCartRequest.external_id) {
      attributes.push({ key: '_external_id', value: String(externalCartRequest.external_id) });
    }

    // Core diamond specs
    if (metadata.carat) attributes.push({ key: 'Carat', value: metadata.carat });
    if (metadata.color) attributes.push({ key: 'Color', value: metadata.color });
    if (metadata.clarity) attributes.push({ key: 'Clarity', value: metadata.clarity });
    if (metadata.cutGrade) attributes.push({ key: 'Cut Grade', value: metadata.cutGrade });
    
    // Certificate information
    if (metadata.gradingLab) attributes.push({ key: 'Grading Lab', value: metadata.gradingLab });
    if (metadata.certificateType) attributes.push({ key: 'Certificate Type', value: metadata.certificateType });
    if (metadata.certificateNumber) attributes.push({ key: 'Certificate Number', value: metadata.certificateNumber });
    
    // Item ID and Image URL (human-readable)
    if (metadata.itemId) attributes.push({ key: 'Item ID', value: metadata.itemId });
    if (metadata.imageUrl) attributes.push({ key: 'Image URL', value: metadata.imageUrl });
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('External cart add - attributes created:', {
        attributesCount: attributes.length,
        attributes: attributes,
      });
    }

    // If cartId is provided, add to existing cart
    if (cartId) {
      const { cartService } = await import('@/services/shopify/cart.service');

      const updatedCart = await cartService.addLinesToCart(cartId, [
        {
          merchandiseId: variantResult.variantId,
          quantity: 1,
          attributes: attributes,
        },
      ]);

      // If cart doesn't exist (expired or invalid), create a new cart instead,
      // preserving any existing lines sent from the frontend
      if (!updatedCart) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Cart does not exist or expired, creating new cart with existing items');
        }
        
        const allLines = [
          ...(existingCartLines || []),
          {
            merchandiseId: variantResult.variantId,
            quantity: 1,
            attributes: attributes,
          },
        ];

        const cartResult = await externalCartService.createCartWithLines(allLines);

        if (cartResult.error || !cartResult.checkoutUrl || !cartResult.cart) {
          return NextResponse.json(
            {
              error: 'Failed to add to cart',
              details: cartResult.error || 'Unknown error',
            },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          checkoutUrl: cartResult.checkoutUrl,
          cartId: cartResult.cartId,
          cart: cartResult.cart,
          variantId: variantResult.variantId,
          productId: productId,
        });
      }

      return NextResponse.json({
        success: true,
        cart: updatedCart,
        cartId: updatedCart.id,
        checkoutUrl: updatedCart.checkoutUrl,
        variantId: variantResult.variantId,
        productId: productId,
      });
    }

    // Otherwise, create a new cart (backwards compatibility)
    // Pass attributes to createCart so metadata appears in the cart line item
    const cartResult = await externalCartService.addVariantToCart(variantResult.variantId, attributes);

    if (cartResult.error || !cartResult.checkoutUrl) {
      return NextResponse.json(
        {
          error: 'Failed to add to cart',
          details: cartResult.error || 'Unknown error',
        },
        { status: 500 }
      );
    }

    // Use cart from result if available, otherwise try to fetch it
    let fullCart = cartResult.cart || null;
    if (!fullCart && cartResult.cartId) {
      const { cartService } = await import('@/services/shopify/cart.service');
      // Fetch using raw ID
      fullCart = await cartService.getCart(cartResult.cartId);

      if (process.env.NODE_ENV !== 'production') {
        console.log('Fetched cart after creation:', {
          hasCart: !!fullCart,
          linesCount: fullCart?.lines?.length || 0,
        });
      }
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: cartResult.checkoutUrl,
      cartId: cartResult.cartId,
      cart: fullCart,
      variantId: variantResult.variantId,
      productId: productId,
    });
  } catch (error) {
    // Enhanced error logging for debugging
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error in external cart add:', error);
      if (error instanceof Error) {
        console.error('Error stack:', error.stack);
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        // Include more details in development
        ...(process.env.NODE_ENV !== 'production' && {
          details: error instanceof Error ? error.stack : undefined,
        }),
      },
      { status: 500 }
    );
  }
}
