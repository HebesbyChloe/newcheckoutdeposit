// External Cart Service - Handles adding external products to Shopify cart
import { adminProductService } from './admin/product.service';
import { metafieldService } from './admin/metafield.service';
import { cartService } from './cart.service';
import { externalDiamondCache } from '@/lib/cache/external-diamond-cache';

// Helper function to set variant metafields with diamond metadata
async function setVariantMetafields(
  variantId: string,
  payload: Record<string, any> | undefined,
  extractMetadata: (payload?: Record<string, any>) => {
    carat?: string;
    color?: string;
    clarity?: string;
    cutGrade?: string;
    certificateType?: string;
    certificateNumber?: string;
  }
): Promise<void> {
  const metadata = extractMetadata(payload);
  const metafieldsToSet = [
    {
      namespace: 'custom',
      key: 'payload',
      value: JSON.stringify(payload || {}),
      type: 'json',
      ownerId: variantId,
    },
  ];

  // Add individual metadata fields for easy display
  if (metadata.carat) {
    metafieldsToSet.push({
      namespace: 'custom',
      key: 'carat',
      value: metadata.carat,
      type: 'single_line_text_field',
      ownerId: variantId,
    });
  }
  if (metadata.color) {
    metafieldsToSet.push({
      namespace: 'custom',
      key: 'color',
      value: metadata.color,
      type: 'single_line_text_field',
      ownerId: variantId,
    });
  }
  if (metadata.clarity) {
    metafieldsToSet.push({
      namespace: 'custom',
      key: 'clarity',
      value: metadata.clarity,
      type: 'single_line_text_field',
      ownerId: variantId,
    });
  }
  if (metadata.cutGrade) {
    metafieldsToSet.push({
      namespace: 'custom',
      key: 'cut_grade',
      value: metadata.cutGrade,
      type: 'single_line_text_field',
      ownerId: variantId,
    });
  }
  if (metadata.certificateType) {
    metafieldsToSet.push({
      namespace: 'custom',
      key: 'certificate_type',
      value: metadata.certificateType,
      type: 'single_line_text_field',
      ownerId: variantId,
    });
  }
  if (metadata.certificateNumber) {
    metafieldsToSet.push({
      namespace: 'custom',
      key: 'certificate_number',
      value: metadata.certificateNumber,
      type: 'single_line_text_field',
      ownerId: variantId,
    });
  }

  // Set all metafields
  for (const mf of metafieldsToSet) {
    await metafieldService.setMetafield(mf);
  }
}

export class ExternalCartService {
  /**
   * Find dummy product by source type
   * Tries multiple strategies to find the product
   */
  async findDummyProduct(sourceType: 'labgrown' | 'natural'): Promise<{ productId: string | null; error: string | null }> {
    try {
      // Check cache first
      const cachedId = externalDiamondCache.getDummyProductId(sourceType);
      if (cachedId) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Dummy product ID from cache:', { sourceType, productId: cachedId });
        }
        return { productId: cachedId, error: null };
      }

      const result = await adminProductService.findProductByMetafield('custom', 'source_type', sourceType);
      
      if (result.product) {
        externalDiamondCache.setDummyProductId(sourceType, result.product.id);
        return {
          productId: result.product.id,
          error: null,
        };
      }

      return {
        productId: null,
        error: result.error || 'Product not found',
      };
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Exception in findDummyProduct:', error);
      }
      return {
        productId: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create dummy product for external items
   */
  async createDummyProduct(sourceType: 'labgrown' | 'natural'): Promise<{ productId: string | null; error: string | null }> {
    try {
      const result = await adminProductService.createProduct({
        title: `External Dummy - ${sourceType}`,
        status: 'ACTIVE',
        metafields: [
          {
            namespace: 'custom',
            key: 'source_type',
            value: sourceType,
            type: 'single_line_text_field',
          },
          {
            namespace: 'custom',
            key: 'payload_template',
            value: JSON.stringify({}),
            type: 'json',
          },
        ],
      });

      if (result.error || !result.product) {
        return {
          productId: null,
          error: result.error || 'Failed to create product',
        };
      }

      externalDiamondCache.setDummyProductId(sourceType, result.product.id);

      return {
        productId: result.product.id,
        error: null,
      };
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Exception in createDummyProduct:', error);
      }
      return {
        productId: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Extract diamond metadata from payload
   */
  private extractDiamondMetadata(payload?: Record<string, any>): {
    carat?: string;
    color?: string;
    clarity?: string;
    cutGrade?: string;
    certificateType?: string;
    certificateNumber?: string;
  } {
    if (!payload) return {};

    // Helper to get value from various possible field names
    const getField = (keys: string[]): string | undefined => {
      for (const key of keys) {
        const value = payload[key] || payload[key.toLowerCase()] || payload[key.toUpperCase()];
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
    };
  }

  /**
   * Find or create variant for external product
   */
  async findOrCreateVariant(
    productId: string,
    externalId: string,
    price: number,
    title: string,
    image?: string,
    payload?: Record<string, any>
  ): Promise<{ variantId: string | null; error: string | null }> {
    try {
      const sku = `EXT-${externalId}`;

      // Fast path: if we have a cached variant for this externalId, update it and skip product lookup
      const cached = externalDiamondCache.getVariant(externalId);
      if (cached && cached.variantId) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Using cached variant for external diamond:', {
            externalId,
            cached,
          });
        }

        const updateResult = await adminProductService.updateVariant(cached.variantId, {
          price: price.toFixed(2),
          sku,
        });

        if (updateResult.error) {
          if (process.env.NODE_ENV !== 'production') {
            console.error('Failed to update cached variant:', updateResult.error);
          }
          // fall through to slower path below
        } else {
          const { setVariantInventory } = await import('./admin/inventory.service');
          await Promise.all([
            setVariantInventory(cached.variantId, 1),
            adminProductService.publishProductToOnlineStore(cached.productId),
            setVariantMetafields(cached.variantId, payload, (p) =>
              this.extractDiamondMetadata(p)
            ),
          ]);

          return {
            variantId: cached.variantId,
            error: null,
          };
        }
      }

      // Get product to check existing variants
      const productResult = await adminProductService.getProduct(productId);

      if (productResult.error || !productResult.product) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Failed to get product:', {
            productId,
            error: productResult.error,
          });
        }
        return {
          variantId: null,
          error: productResult.error || 'Failed to get product',
        };
      }

      const product = productResult.product;

      // Always proceed with SKU-based variant logic so each external_id
      // can have its own variant and independent price.
      if (process.env.NODE_ENV !== 'production') {
        console.log('Proceeding with SKU-based variant logic for external item.', {
          productId,
          sku,
          hasOptions: !!product.options && product.options.length > 0,
        });
      }

      // Check if variant with this SKU already exists
      const existingVariant = product.variants.find((v) => v.sku === sku);

      if (existingVariant) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Found existing variant:', existingVariant.id);
        }
        
        // Update existing variant
        const updateResult = await adminProductService.updateVariant(existingVariant.id, {
          price: price.toFixed(2),
          sku,
        });

        if (updateResult.error) {
          if (process.env.NODE_ENV !== 'production') {
            console.error('Failed to update variant:', updateResult.error);
          }
          return {
            variantId: null,
            error: updateResult.error,
          };
        }

        // Set inventory, publish, and metafields in parallel
        const { setVariantInventory } = await import('./admin/inventory.service');
        await Promise.all([
          setVariantInventory(existingVariant.id, 1),
          adminProductService.publishProductToOnlineStore(productId),
          setVariantMetafields(existingVariant.id, payload, (p) =>
            this.extractDiamondMetadata(p)
          ),
        ]);

        externalDiamondCache.setVariant(externalId, productId, existingVariant.id);

        return {
          variantId: existingVariant.id,
          error: null,
        };
      }

      // Create new variant (one per external_id). We use REST directly so we can
      // set option1 = externalId; otherwise Shopify complains that the
      // 'Default Title' variant already exists.
      if (process.env.NODE_ENV !== 'production') {
        console.log('Creating new variant for external item:', {
          productId,
          price: price.toFixed(2),
          sku,
          externalId,
        });
      }

      const { createVariantRest } = await import('./admin/product-rest.service');
      const createResult = await createVariantRest(productId, {
        price: price.toFixed(2),
        sku,
        option1: externalId,
      });

      if (createResult.error || !createResult.variant) {
        return {
          variantId: null,
          error: createResult.error || 'Failed to create variant',
        };
      }

      // Set inventory, publish, and metafields in parallel
      const { setVariantInventory } = await import('./admin/inventory.service');
      await Promise.all([
        setVariantInventory(createResult.variant.id, 1),
        adminProductService.publishProductToOnlineStore(productId),
        setVariantMetafields(createResult.variant.id, payload, (p) =>
          this.extractDiamondMetadata(p)
        ),
      ]);

      externalDiamondCache.setVariant(externalId, productId, createResult.variant.id);

      return {
        variantId: createResult.variant.id,
        error: null,
      };
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Exception in findOrCreateVariant:', error);
      }
      return {
        variantId: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Add variant to cart using Storefront API
   * Retries if variant is not immediately available (sync delay)
   */
  async addVariantToCart(variantId: string, attributes?: Array<{ key: string; value: string }>): Promise<{ checkoutUrl: string | null; cartId: string | null; cart: any | null; error: string | null }> {
    try {
      const maxRetries = 3;
      const retryDelay = 1000;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const result = await cartService.createCart({
          variantId,
          quantity: 1,
          attributes: attributes || [],
        });

        if (!result.error && result.checkoutUrl) {
          return {
            checkoutUrl: result.checkoutUrl,
            cartId: result.cartId || null,
            cart: result.cart || null, // Return cart if available
            error: null,
          };
        }

        if (result.error && result.error.includes('does not exist') && attempt < maxRetries) {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`Variant not available yet (attempt ${attempt}/${maxRetries}), retrying in ${retryDelay}ms...`);
          }
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }

        if (process.env.NODE_ENV !== 'production') {
          console.error('Cart creation error:', {
            variantId,
            error: result.error,
            attempt,
          });
        }
        return {
          checkoutUrl: null,
          cartId: null,
          cart: null,
          error: result.error || 'Failed to create cart',
        };
      }

      return {
        checkoutUrl: null,
        cartId: null,
        cart: null,
        error: 'Failed to create cart after retries',
      };
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Exception in addVariantToCart:', error);
      }
      return {
        checkoutUrl: null,
        cartId: null,
        cart: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create cart with multiple lines (for preserving existing items when cart expires)
   */
  async createCartWithLines(
    lines: Array<{
      merchandiseId: string;
      quantity: number;
      attributes?: Array<{ key: string; value: string }>;
    }>
  ): Promise<{ checkoutUrl: string | null; cartId: string | null; cart: any | null; error: string | null }> {
    try {
      const result = await cartService.createCartWithLines({
        lines,
      });

      if (!result.error && result.checkoutUrl) {
        return {
          checkoutUrl: result.checkoutUrl,
          cartId: result.cartId || null,
          cart: result.cart || null,
          error: null,
        };
      }

      return {
        checkoutUrl: null,
        cartId: null,
        cart: null,
        error: result.error || 'Failed to create cart',
      };
    } catch (error) {
      return {
        checkoutUrl: null,
        cartId: null,
        cart: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const externalCartService = new ExternalCartService();
