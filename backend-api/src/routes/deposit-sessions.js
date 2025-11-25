const express = require('express');
const router = express.Router();
const depositService = require('../services/depositService');

// POST /api/v1/deposit-sessions - Create deposit session
router.post('/', async (req, res, next) => {
  try {
    const { cartId, customer_id, lines, total_amount, deposit_amount, plan_id } = req.body;
    
    if (!cartId) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'cartId is required'
      });
    }
    
    const result = await depositService.createDepositSession({
      cartId,
      customerId: customer_id,
      lines,
      totalAmount: total_amount,
      depositAmount: deposit_amount,
      planId: plan_id
    });
    
    res.json(result);
  } catch (error) {
    if (error.code) {
      const statusCode = error.code === 'DATABASE_NOT_CONFIGURED' || error.code === 'DEPOSIT_PRODUCT_NOT_CONFIGURED' ? 503 :
                        error.code === 'PLAN_NOT_FOUND' || error.code === 'NO_PLANS_AVAILABLE' ? 404 : 400;
      res.status(statusCode).json({
        code: error.code,
        message: error.message
      });
    } else {
      next(error);
    }
  }
});

// GET /api/v1/deposit-sessions/:sessionId - Get deposit session
router.get('/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await depositService.getDepositSession(sessionId);
    res.json(session);
  } catch (error) {
    if (error.code === 'SESSION_NOT_FOUND') {
      res.status(404).json({
        code: error.code,
        message: error.message
      });
    } else {
      next(error);
    }
  }
});

// POST /api/v1/deposit-sessions/:sessionId/checkout - Create checkout for deposit
router.post('/:sessionId/checkout', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const result = await depositService.createCheckoutForDeposit(sessionId);
    res.json(result);
  } catch (error) {
    if (error.code) {
      res.status(error.code === 'SESSION_NOT_FOUND' ? 404 : 400).json({
        code: error.code,
        message: error.message
      });
    } else {
      next(error);
    }
  }
});

// POST /api/v1/deposit-sessions/:sessionId/complete - Complete deposit order
router.post('/:sessionId/complete', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const result = await depositService.completeDepositOrder(sessionId);
    res.json(result);
  } catch (error) {
    if (error.code) {
      res.status(error.code === 'SESSION_NOT_FOUND' ? 404 : 400).json({
        code: error.code,
        message: error.message
      });
    } else {
      next(error);
    }
  }
});

module.exports = router;

