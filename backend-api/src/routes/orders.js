const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const orderService = require('../services/orderService');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

// Complex order calculations (specific route - must come first)
router.post('/calculate', async (req, res, next) => {
  try {
    const { orderItems, discounts, shipping, tax } = req.body;
    
    const calculation = await orderService.calculateOrderTotal({
      orderItems,
      discounts,
      shipping,
      tax
    });

    res.json(calculation);
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/orders/:orderId/complete-remaining (specific route with suffix - must come before generic POST)
router.post('/:orderId/complete-remaining', async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { transactionId } = req.body;
    const shopifyService = require('../services/shopifyService');
    const result = await shopifyService.completeRemainingPayment(orderId, transactionId);
    res.json(result);
  } catch (error) {
    if (error.code) {
      res.status(400).json({
        code: error.code,
        message: error.message
      });
    } else {
      next(error);
    }
  }
});

// Get order with complex joins and aggregations (specific route with /details suffix - must come before generic GET)
router.get('/:id/details', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        o.*,
        json_agg(
          json_build_object(
            'id', oi.id,
            'product_id', oi.product_id,
            'quantity', oi.quantity,
            'price', oi.price,
            'product', json_build_object(
              'name', p.name,
              'sku', p.sku
            )
          )
        ) as items,
        json_build_object(
          'total_items', COUNT(oi.id),
          'total_amount', SUM(oi.quantity * oi.price)
        ) as summary
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN product p ON oi.product_id = p.id
      WHERE o.id = $1
      GROUP BY o.id
    `;

    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/orders/:orderId - Get order payment status (generic route - comes after specific routes)
router.get('/:orderId', async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const shopifyService = require('../services/shopifyService');
    const status = await shopifyService.getOrderPaymentStatus(orderId);
    res.json(status);
  } catch (error) {
    if (error.code) {
      res.status(400).json({
        code: error.code,
        message: error.message
      });
    } else {
      next(error);
    }
  }
});

// Create order with transaction logic (generic POST route - comes after specific routes)
router.post('/', async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { items, customer_id, shipping_address } = req.body;
    
    // Create order
    const orderResult = await client.query(
      'INSERT INTO orders (customer_id, shipping_address, status, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [customer_id, shipping_address, 'pending']
    );
    
    const order = orderResult.rows[0];
    
    // Create order items
    for (const item of items) {
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
        [order.id, item.product_id, item.quantity, item.price]
      );
      
      // Update inventory
      await client.query(
        'UPDATE stock SET qty = qty - $1 WHERE product_sku = $2',
        [item.quantity, item.sku]
      );
    }
    
    await client.query('COMMIT');
    
    res.status(201).json(order);
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

module.exports = router;

