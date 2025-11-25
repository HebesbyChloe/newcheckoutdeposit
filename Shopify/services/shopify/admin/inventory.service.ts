// Inventory service for Admin API
const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN!;
const adminAccessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!;
const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION || '2024-10';

/**
 * Set inventory level for a variant
 * This makes the variant available in Storefront API
 */
export async function setVariantInventory(
  variantId: string,
  quantity: number = 1,
  locationId?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    // Extract numeric variant ID from GID
    const variantIdNum = variantId.replace('gid://shopify/ProductVariant/', '');

    // First, get inventory item ID for the variant
    const variantUrl = `https://${domain}/admin/api/${apiVersion}/variants/${variantIdNum}.json`;
    const variantResponse = await fetch(variantUrl, {
      headers: {
        'X-Shopify-Access-Token': adminAccessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!variantResponse.ok) {
      return {
        success: false,
        error: `Failed to get variant: ${variantResponse.statusText}`,
      };
    }

    const variantData = await variantResponse.json();
    const inventoryItemId = variantData.variant?.inventory_item_id;

    if (!inventoryItemId) {
      return {
        success: false,
        error: 'Variant has no inventory_item_id',
      };
    }

    // Get location ID if not provided (use first available location)
    let finalLocationId = locationId;
    if (!finalLocationId) {
      const locationsUrl = `https://${domain}/admin/api/${apiVersion}/locations.json`;
      const locationsResponse = await fetch(locationsUrl, {
        headers: {
          'X-Shopify-Access-Token': adminAccessToken,
          'Content-Type': 'application/json',
        },
      });

      if (!locationsResponse.ok) {
        return {
          success: false,
          error: `Failed to get locations: ${locationsResponse.statusText}`,
        };
      }

      const locationsData = await locationsResponse.json();
      if (!locationsData.locations || locationsData.locations.length === 0) {
        return {
          success: false,
          error: 'No locations found',
        };
      }

      finalLocationId = locationsData.locations[0].id.toString();
    }

    // Set inventory level
    const inventoryUrl = `https://${domain}/admin/api/${apiVersion}/inventory_levels/set.json`;
    const inventoryResponse = await fetch(inventoryUrl, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': adminAccessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        location_id: finalLocationId,
        inventory_item_id: inventoryItemId,
        available: quantity,
      }),
    });

    if (!inventoryResponse.ok) {
      const errorData = await inventoryResponse.json();
      return {
        success: false,
        error: errorData.errors ? JSON.stringify(errorData.errors) : inventoryResponse.statusText,
      };
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`Set inventory for variant ${variantIdNum}: ${quantity} at location ${finalLocationId}`);
    }

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Exception setting variant inventory:', error);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

