const shopifyService = require('./shopifyService');
const cartService = require('./cartService');

class CheckoutService {
  async createCheckoutFromCart(cartId) {
    // Load internal cart
    const cart = await cartService.getCart(cartId);
    
    if (!cart || cart.lines.length === 0) {
      throw {
        code: 'CART_EMPTY',
        message: 'Cart is empty'
      };
    }
    
    // Build Shopify Storefront cart lines
    // Note: Shopify requires variantId for cart operations, but we're using productId
    // We need to get the default variant ID from external_variants table
    const cartLines = [];
    const { Pool } = require('pg');
    const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: false }) : null;
    
    for (const line of cart.lines) {
      let variantIdForCart = null;
      
      // If we have productId, get the default variant ID from external_variants
      if (line.productId && pool) {
        try {
          const variantResult = await pool.query(
            `SELECT variant_id FROM external_variants WHERE product_id = $1 LIMIT 1`,
            [line.productId]
          );
          if (variantResult.rows.length > 0 && variantResult.rows[0].variant_id) {
            variantIdForCart = variantResult.rows[0].variant_id;
          }
        } catch (error) {
          console.warn('Failed to get variant ID for cart:', error.message);
        }
      }
      
      // Fallback to variantId if available
      if (!variantIdForCart && line.variantId) {
        variantIdForCart = line.variantId;
      }
      
      if (!variantIdForCart) {
        throw {
          code: 'MISSING_VARIANT',
          message: `Variant ID missing for line ${line.id}. Product needs a default variant for Shopify cart operations.`
        };
      }
      
      cartLines.push({
        merchandiseId: variantIdForCart,
        quantity: line.quantity,
        attributes: line.attributes.map(attr => ({
          key: attr.key,
          value: attr.value
        }))
      });
    }
    
    // Create Shopify cart via Storefront API
    const cartResult = await shopifyService.createStorefrontCart(cartLines);
    
    // Update cart table with shopify_cart_id and shopify_cart_url
    if (cartResult.cartId && cartResult.checkoutUrl && pool) {
      try {
        // Extract numeric cart ID from GID format (gid://shopify/Cart/123456) -> 123456
        const shopifyCartIdMatch = cartResult.cartId.match(/\/(\d+)$/);
        const shopifyCartIdNumeric = shopifyCartIdMatch ? shopifyCartIdMatch[1] : cartResult.cartId;
        
        // Check which columns exist
        const columnCheck = await pool.query(
          `SELECT column_name 
           FROM information_schema.columns 
           WHERE table_name = 'carts' 
           AND column_name IN ('shopify_cart_id', 'shopify_cart_url')`
        );
        const existingColumns = columnCheck.rows.map(r => r.column_name);
        const hasShopifyCartId = existingColumns.includes('shopify_cart_id');
        const hasShopifyCartUrl = existingColumns.includes('shopify_cart_url');
        
        // Build UPDATE statement dynamically
        const updateColumns = [];
        const updateValues = [];
        let paramIndex = 1;
        
        if (hasShopifyCartId) {
          updateColumns.push(`shopify_cart_id = $${paramIndex}`);
          updateValues.push(shopifyCartIdNumeric);
          paramIndex++;
        }
        
        if (hasShopifyCartUrl) {
          updateColumns.push(`shopify_cart_url = $${paramIndex}`);
          updateValues.push(cartResult.checkoutUrl);
          paramIndex++;
        }
        
        if (updateColumns.length > 0) {
          updateColumns.push('updated_at = NOW()');
          updateValues.push(cartId);
          
          await pool.query(
            `UPDATE carts SET ${updateColumns.join(', ')} WHERE id = $${paramIndex}`,
            updateValues
          );
          console.log(`Updated cart ${cartId} with shopify_cart_id: ${shopifyCartIdNumeric} and checkout URL`);
        }
      } catch (error) {
        console.warn('Failed to update cart with Shopify cart info:', error.message);
        // Don't fail the checkout if DB update fails
      }
    }
    
    return {
      cartId: cartResult.cartId,
      checkoutUrl: cartResult.checkoutUrl
    };
  }
}

module.exports = new CheckoutService();

