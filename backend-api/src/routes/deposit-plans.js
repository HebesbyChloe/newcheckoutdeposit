const express = require('express');
const router = express.Router();
const depositPlanService = require('../services/depositPlanService');

// GET /api/v1/deposit-plans - Get all active plans
router.get('/', async (req, res, next) => {
  try {
    const plans = await depositPlanService.getAllActivePlans();
    res.json(plans);
  } catch (error) {
    if (error.code) {
      res.status(error.code === 'DATABASE_NOT_CONFIGURED' ? 503 : 400).json({
        code: error.code,
        message: error.message
      });
    } else {
      next(error);
    }
  }
});

// GET /api/v1/deposit-plans/default - Get default plan
router.get('/default', async (req, res, next) => {
  try {
    const plan = await depositPlanService.getDefaultPlan();
    res.json(plan);
  } catch (error) {
    if (error.code) {
      const statusCode = error.code === 'NO_PLANS_AVAILABLE' ? 404 :
                        error.code === 'DATABASE_NOT_CONFIGURED' ? 503 : 400;
      res.status(statusCode).json({
        code: error.code,
        message: error.message
      });
    } else {
      next(error);
    }
  }
});

// GET /api/v1/deposit-plans/:planId - Get specific plan
router.get('/:planId', async (req, res, next) => {
  try {
    const { planId } = req.params;
    const plan = await depositPlanService.getPlanById(planId);
    res.json(plan);
  } catch (error) {
    if (error.code === 'PLAN_NOT_FOUND') {
      res.status(404).json({
        code: error.code,
        message: error.message
      });
    } else if (error.code === 'DATABASE_NOT_CONFIGURED') {
      res.status(503).json({
        code: error.code,
        message: error.message
      });
    } else {
      next(error);
    }
  }
});

module.exports = router;

