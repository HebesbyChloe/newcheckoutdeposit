const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

// Complex aggregations
router.get('/aggregate', async (req, res, next) => {
  try {
    const { start_date, end_date, group_by } = req.query;
    
    const query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_orders,
        SUM(total_amount) as revenue,
        AVG(total_amount) as avg_order_value,
        COUNT(DISTINCT customer_id) as unique_customers
      FROM orders
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY DATE(created_at)
      ORDER BY date
    `;
    
    const result = await pool.query(query, [start_date, end_date]);
    
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Sales by product
router.get('/sales/by-product', async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    
    const query = `
      SELECT 
        p.id,
        p.name,
        p.sku,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.quantity * oi.price) as total_revenue,
        COUNT(DISTINCT oi.order_id) as order_count
      FROM order_items oi
      JOIN product p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.created_at BETWEEN $1 AND $2
      GROUP BY p.id, p.name, p.sku
      ORDER BY total_revenue DESC
    `;
    
    const result = await pool.query(query, [start_date, end_date]);
    
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

