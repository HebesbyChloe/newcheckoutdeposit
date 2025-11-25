import { internalCartStorage } from '@/lib/storage/cart-storage';
import { InternalCart, InternalCartItem } from '@/types/internal-cart.types';
import { externalCartService } from '@/services/shopify/external-cart.service';
import { Cart, CartLine } from '@/types/api.types';

export interface ShopifyLineInput {
  merchandiseId: string;
  quantity: number;
  attributes?: Array<{ key: string; value: string }>;
}

export interface BuildShopifyLinesResult {
  lines: ShopifyLineInput[];
  totalAmount: number;
  currencyCode: string;
  error?: string;
}

function getAttributeValueFromInternal(
  item: InternalCartItem,
  key: string
): string | undefined {
  return item.attributes?.find((attr) => attr.key === key)?.value;
}

function getAttributeValueFromCartLine(
  line: CartLine,
  key: string
): string | undefined {
  return line.attributes?.find((attr) => attr.key === key)?.value;
}

export async function buildShopifyLinesFromInternalCart(
  cartId: string
): Promise<BuildShopifyLinesResult> {
  const cart: InternalCart | null = internalCartStorage.getCart(cartId);

  if (!cart) {
    return {
      lines: [],
      totalAmount: 0,
      currencyCode: 'USD',
      error: 'Internal cart not found or expired',
    };
  }

  if (!cart.items || cart.items.length === 0) {
    return {
      lines: [],
      totalAmount: 0,
      currencyCode: 'USD',
      error: 'Cart is empty',
    };
  }

  const lines: ShopifyLineInput[] = [];
  let totalAmount = 0;
  let currencyCode = cart.items[0].price.currencyCode || 'USD';

  for (const item of cart.items) {
    const quantity = item.quantity > 0 ? item.quantity : 1;
    const unitPrice = parseFloat(item.price.amount || '0');

    if (!unitPrice || unitPrice <= 0) {
      return {
        lines: [],
        totalAmount: 0,
        currencyCode,
        error: `Invalid price for item "${item.title}"`,
      };
    }

    if (!item.price.currencyCode) {
      item.price.currencyCode = currencyCode;
    } else {
      currencyCode = item.price.currencyCode;
    }

    let merchandiseId: string | undefined;

    if (item.source === 'shopify') {
      // Native Shopify product - expect Shopify variant GID
      if (!item.variantId) {
        return {
          lines: [],
          totalAmount: 0,
          currencyCode,
          error: `Missing Shopify variantId for item "${item.title}"`,
        };
      }

      if (item.variantId.startsWith('gid://shopify/ProductVariant/')) {
        merchandiseId = item.variantId;
      } else if (item.variantId.startsWith('variant-')) {
        // Backwards-compatibility: mis-labelled external diamond stored as shopify
        const externalId = item.variantId.replace('variant-', '');
        const sourceType =
          (getAttributeValueFromInternal(item, '_source_type') as
            | 'labgrown'
            | 'natural'
            | undefined) || 'labgrown';

        let { productId, error } = await externalCartService.findDummyProduct(
          sourceType
        );

        if (!productId) {
          const created = await externalCartService.createDummyProduct(
            sourceType
          );
          productId = created.productId;
          error = created.error;
        }

        if (!productId || error) {
          return {
            lines: [],
            totalAmount: 0,
            currencyCode,
            error:
              error || `Failed to prepare dummy product for "${item.title}"`,
          };
        }

        const variantResult = await externalCartService.findOrCreateVariant(
          productId,
          externalId,
          unitPrice,
          item.title,
          item.imageUrl,
          item.payload
        );

        if (!variantResult.variantId || variantResult.error) {
          return {
            lines: [],
            totalAmount: 0,
            currencyCode,
            error:
              variantResult.error ||
              `Failed to create variant for external item "${item.title}"`,
          };
        }

        merchandiseId = variantResult.variantId;
      } else {
        return {
          lines: [],
          totalAmount: 0,
          currencyCode,
          error: `Invalid Shopify variantId for item "${item.title}"`,
        };
      }
    } else {
      // External product - prefer variantId created when adding to internal cart
      if (item.variantId) {
        merchandiseId = item.variantId;
      } else {
        // Backwards-compatibility for older carts: ensure dummy/variant now
        const externalId =
          item.externalId ||
          getAttributeValueFromInternal(item, '_external_id') ||
          getAttributeValueFromInternal(item, 'Item ID');

        if (!externalId) {
          return {
            lines: [],
            totalAmount: 0,
            currencyCode,
            error: `Missing external_id for external item "${item.title}"`,
          };
        }

        const sourceType =
          (getAttributeValueFromInternal(item, '_source_type') as
            | 'labgrown'
            | 'natural'
            | undefined) || 'labgrown';

        // 1) Find or create dummy product for this source type
        let { productId, error } = await externalCartService.findDummyProduct(
          sourceType
        );

        if (!productId) {
          const created = await externalCartService.createDummyProduct(
            sourceType
          );
          productId = created.productId;
          error = created.error;
        }

        if (!productId || error) {
          return {
            lines: [],
            totalAmount: 0,
            currencyCode,
            error:
              error || `Failed to prepare dummy product for "${item.title}"`,
          };
        }

        // 2) Find or create variant for this specific external diamond
        const variantResult = await externalCartService.findOrCreateVariant(
          productId,
          externalId,
          unitPrice,
          item.title,
          item.imageUrl,
          item.payload
        );

        if (!variantResult.variantId || variantResult.error) {
          return {
            lines: [],
            totalAmount: 0,
            currencyCode,
            error:
              variantResult.error ||
              `Failed to create variant for external item "${item.title}"`,
          };
        }

        merchandiseId = variantResult.variantId;
      }
    }

    if (!merchandiseId) {
      return {
        lines: [],
        totalAmount: 0,
        currencyCode,
        error: `Failed to resolve merchandiseId for item "${item.title}"`,
      };
    }

    lines.push({
      merchandiseId,
      quantity,
      attributes: item.attributes,
    });

    totalAmount += unitPrice * quantity;
  }

  return {
    lines,
    totalAmount,
    currencyCode,
  };
}

/**
 * Fallback: build Shopify lines directly from a Cart snapshot (client-side cart)
 * Used when the in-memory internal cart has been lost (e.g. server restart).
 */
export async function buildShopifyLinesFromCartSnapshot(
  cart: Cart
): Promise<BuildShopifyLinesResult> {
  if (!cart || !cart.lines || cart.lines.length === 0) {
    return {
      lines: [],
      totalAmount: 0,
      currencyCode: cart?.cost?.totalAmount?.currencyCode || 'USD',
      error: 'Cart is empty',
    };
  }

  const lines: ShopifyLineInput[] = [];
  let totalAmount = 0;
  let currencyCode =
    cart.cost?.totalAmount?.currencyCode ||
    cart.cost?.subtotalAmount?.currencyCode ||
    'USD';

  for (const line of cart.lines) {
    const quantity = line.quantity > 0 ? line.quantity : 1;
    const unitPrice = parseFloat(line.merchandise.price.amount || '0');

    if (!unitPrice || unitPrice <= 0) {
      return {
        lines: [],
        totalAmount: 0,
        currencyCode,
        error: `Invalid price for item "${line.merchandise.title}"`,
      };
    }

    if (!line.merchandise.price.currencyCode) {
      line.merchandise.price.currencyCode = currencyCode;
    } else {
      currencyCode = line.merchandise.price.currencyCode;
    }

    // For snapshot, always trust merchandise.id as the variant ID
    const merchandiseId = line.merchandise.id;

    if (!merchandiseId) {
      return {
        lines: [],
        totalAmount: 0,
        currencyCode,
        error: `Failed to resolve merchandiseId for item "${line.merchandise.title}"`,
      };
    }

    lines.push({
      merchandiseId,
      quantity,
      attributes: line.attributes,
    });

    totalAmount += unitPrice * quantity;
  }

  return {
    lines,
    totalAmount,
    currencyCode,
  };
}


