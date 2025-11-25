const express = require('express');
const router = express.Router();
const checkoutService = require('../services/checkoutService');

// POST /api/v1/checkout - Create checkout from cart
router.post('/', async (req, res, next) => {
  try {
    const { cartId } = req.body;
    
    if (!cartId) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'cartId is required'
      });
    }
    
    const result = await checkoutService.createCheckoutFromCart(cartId);
    res.json(result);
  } catch (error) {
    if (error.code) {
      const statusCode = error.code === 'CART_EMPTY' ? 400 : 502;
      res.status(statusCode).json({
        code: error.code,
        message: error.message
      });
    } else {
      next(error);
    }
  }
});

module.exports = router;

