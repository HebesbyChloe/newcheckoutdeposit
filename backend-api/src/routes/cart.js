const express = require('express');
const router = express.Router();
const cartService = require('../services/cartService');
const shopifyService = require('../services/shopifyService');
const productDiamondService = require('../services/productDiamondService');

// POST /api/v1/cart/items - Add item to cart
router.post('/items', async (req, res, next) => {
  try {
    const {
      cartId,
      source,
      externalId,
      variantId,
      productHandle,
      title,
      imageUrl,
      price,
      quantity,
      attributes,
      payload,
      customerId
    } = req.body;
    
    // For external items: Shopify create → DB write with shopify_product_id → Cart add
    let finalProductId = null;
    if (source === 'external') {
      // Step 1: Create or find Shopify product first (check by SKU/externalId)
      // Only if Shopify is configured
      if (!process.env.SHOPIFY_STORE_URL || !process.env.SHOPIFY_ADMIN_ACCESS_TOKEN) {
        return res.status(503).json({
          code: 'SHOPIFY_NOT_CONFIGURED',
          message: 'Shopify is not configured. Please set SHOPIFY_STORE_URL and SHOPIFY_ADMIN_ACCESS_TOKEN in environment variables.'
        });
      }
      
      try {
        finalProductId = await shopifyService.createOrFindProductForExternal({
          externalId,
          productHandle,
          title,
          imageUrl,
          price,
          attributes,
          payload
        });
        console.log(`Created/found Shopify product: ${finalProductId} for external diamond ${externalId}`);
      } catch (shopifyError) {
        // If Shopify fails, fail entire operation (don't create in DB)
        console.error('Shopify product creation failed:', shopifyError.message);
        return res.status(500).json({
          code: 'SHOPIFY_PRODUCT_CREATION_FAILED',
          message: 'Failed to create or find product in Shopify',
          details: { originalError: shopifyError.message }
        });
      }
      
      // Step 2: Write to product and diamond tables with shopify_product_id
      try {
        const { productId: dbProductId } = await productDiamondService.createOrFindProductAndDiamond(
          externalId,
          payload,
          attributes,
          price,
          imageUrl,
          title,
          finalProductId // Pass Shopify product ID
        );
        if (dbProductId) {
          console.log(`Created/found product in DB: ${dbProductId} for external diamond ${externalId}`);
        }
      } catch (dbError) {
        // If DB write fails, log but continue - cart can still work
        console.warn('Product/diamond DB write failed:', dbError.message);
        // Don't fail the entire request, but log the error
      }
    }
    
    const cart = await cartService.addItemToCart({
      cartId,
      source,
      externalId,
      variantId: null, // No variants, we use productId instead
      productId: finalProductId, // Add productId
      productHandle,
      title,
      imageUrl,
      price,
      quantity,
      attributes,
      payload,
      customerId
    });
    
    res.json({
      cartId: cart.id,
      cart
    });
  } catch (error) {
    console.error('Error in cart route:', error);
    if (error.code) {
      const statusCode = error.code === 'EXTERNAL_ALREADY_IN_CART' ? 409 : 
                        error.code === 'DATABASE_NOT_CONFIGURED' ? 503 : 400;
      res.status(statusCode).json({
        code: error.code,
        message: error.message || 'An error occurred',
        details: error.details
      });
    } else {
      // Handle connection errors
      if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
        res.status(503).json({
          code: 'SERVICE_UNAVAILABLE',
          message: 'Database or external service connection failed',
          details: { originalError: error.message }
        });
      } else {
        next(error);
      }
    }
  }
});

// GET /api/v1/cart/:cartId - Get cart
router.get('/:cartId', async (req, res, next) => {
  try {
    const { cartId } = req.params;
    const cart = await cartService.getCart(cartId);
    res.json(cart);
  } catch (error) {
    if (error.code === 'CART_NOT_FOUND') {
      res.status(404).json({
        code: error.code,
        message: error.message
      });
    } else {
      next(error);
    }
  }
});

// PUT /api/v1/cart/items - Update line quantity
router.put('/items', async (req, res, next) => {
  try {
    const { cartId, lineId, quantity } = req.body;
    
    if (!cartId || !lineId || quantity === undefined) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'cartId, lineId, and quantity are required'
      });
    }
    
    const cart = await cartService.updateLineQuantity(cartId, lineId, quantity);
    res.json(cart);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/cart/items - Remove line
router.delete('/items', async (req, res, next) => {
  try {
    const { cartId, lineId } = req.body;
    
    if (!cartId || !lineId) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'cartId and lineId are required'
      });
    }
    
    const cart = await cartService.removeLine(cartId, lineId);
    res.json(cart);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

