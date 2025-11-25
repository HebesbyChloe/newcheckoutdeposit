// REST API fallback for variant creation when GraphQL fails
import { adminClient } from '@/lib/shopify/admin/client';

const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN!;
const adminAccessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!;
const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION || '2024-10';

export interface ProductVariant {
  id: string;
  sku: string | null;
  price: string;
  title: string;
}

/**
 * Create variant using REST API (fallback when GraphQL doesn't work)
 */
export async function createVariantRest(
  productId: string,
  input: {
    price: string;
    sku?: string;
    option1?: string;
  }
): Promise<{ variant: ProductVariant | null; error: string | null }> {
  try {
    // Extract numeric product ID from GID
    const productIdNum = productId.replace('gid://shopify/Product/', '');
    
    const url = `https://${domain}/admin/api/${apiVersion}/products/${productIdNum}/variants.json`;
    
    const variantData: any = {
      variant: {
        price: input.price,
      },
    };

    // Only include SKU if provided (don't send undefined)
    if (input.sku) {
      variantData.variant.sku = input.sku;
    }

    // Use option1 to ensure unique variant combination (required when product
    // currently has only the default "Title" option)
    if (input.option1) {
      variantData.variant.option1 = input.option1;
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('Creating variant via REST API:', {
        url,
        productId: productIdNum,
        variantData: JSON.stringify(variantData, null, 2),
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': adminAccessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(variantData),
    });

    let data: any;
    try {
      data = await response.json();
    } catch (parseError) {
      const text = await response.text();
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to parse REST API response:', text);
      }
      return {
        variant: null,
        error: `REST API returned invalid JSON. Status: ${response.status}. Response: ${text.substring(0, 200)}`,
      };
    }

    if (!response.ok) {
      const errorMessage = data.errors 
        ? (typeof data.errors === 'string' ? data.errors : JSON.stringify(data.errors))
        : data.error 
        ? (typeof data.error === 'string' ? data.error : JSON.stringify(data.error))
        : `HTTP ${response.status}: ${response.statusText}`;
      
      if (process.env.NODE_ENV !== 'production') {
        console.error('REST API variant creation failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
          responseData: JSON.stringify(data, null, 2),
        });
      }
      return {
        variant: null,
        error: errorMessage,
      };
    }

    if (!data.variant) {
      return {
        variant: null,
        error: 'Variant creation succeeded but no variant was returned',
      };
    }

    // Convert REST API response to our format
    return {
      variant: {
        id: `gid://shopify/ProductVariant/${data.variant.id}`,
        sku: data.variant.sku,
        price: data.variant.price,
        title: data.variant.title || 'Default Title',
      },
      error: null,
    };
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('REST API variant creation exception:', error);
    }
    return {
      variant: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

