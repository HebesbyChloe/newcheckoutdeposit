const express = require('express');
const router = express.Router();
const shopifyService = require('../services/shopifyService');
const tiktokService = require('../services/tiktokService');

// Shopify webhook handler
router.post('/shopify/webhook', async (req, res, next) => {
  try {
    const { topic, shop, data } = req.body;
    
    // Verify webhook signature (implement based on Shopify requirements)
    // const isValid = shopifyService.verifyWebhook(req);
    // if (!isValid) {
    //   return res.status(401).json({ error: 'Invalid webhook signature' });
    // }
    
    // Process webhook based on topic
    switch (topic) {
      case 'orders/create':
        await shopifyService.handleOrderCreated(data);
        break;
      case 'orders/updated':
        await shopifyService.handleOrderUpdated(data);
        break;
      case 'products/create':
        await shopifyService.handleProductCreated(data);
        break;
      default:
        console.log(`Unhandled webhook topic: ${topic}`);
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
});

// TikTok integration endpoints
router.post('/tiktok/sync', async (req, res, next) => {
  try {
    const { action, data } = req.body;
    
    const result = await tiktokService.syncData(action, data);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Generic webhook handler
router.post('/webhook/:provider', async (req, res, next) => {
  try {
    const { provider } = req.params;
    const payload = req.body;
    
    // Route to appropriate service
    switch (provider) {
      case 'shopify':
        // Handle Shopify webhook
        break;
      case 'tiktok':
        // Handle TikTok webhook
        break;
      default:
        return res.status(400).json({ error: `Unknown provider: ${provider}` });
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

