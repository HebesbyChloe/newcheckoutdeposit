const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

class WorkflowService {
  async processRefund({ order_id, items, reason }) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get order details
      const orderResult = await client.query('SELECT * FROM orders WHERE id = $1', [order_id]);
      if (orderResult.rows.length === 0) {
        throw new Error('Order not found');
      }
      
      const order = orderResult.rows[0];
      
      // Calculate refund amount
      let refundAmount = 0;
      for (const item of items) {
        const itemResult = await client.query(
          'SELECT price, quantity FROM order_items WHERE id = $1 AND order_id = $2',
          [item.item_id, order_id]
        );
        
        if (itemResult.rows.length > 0) {
          const itemData = itemResult.rows[0];
          refundAmount += itemData.price * itemData.quantity;
        }
      }
      
      // Create refund record
      const refundResult = await client.query(
        `INSERT INTO refunds (order_id, amount, reason, status, created_at)
         VALUES ($1, $2, $3, 'pending', NOW()) RETURNING *`,
        [order_id, refundAmount, reason]
      );
      
      // Update order status
      await client.query(
        'UPDATE orders SET status = $1 WHERE id = $2',
        ['refunded', order_id]
      );
      
      // Restore inventory
      for (const item of items) {
        await client.query(
          'UPDATE stock SET qty = qty + $1 WHERE product_sku = (SELECT sku FROM order_items WHERE id = $2)',
          [item.quantity, item.item_id]
        );
      }
      
      await client.query('COMMIT');
      
      return {
        refund_id: refundResult.rows[0].id,
        order_id,
        amount: refundAmount,
        status: 'processed'
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  async processFulfillment({ order_id, fulfillment_data }) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update order with fulfillment info
      await client.query(
        `UPDATE orders 
         SET status = $1, tracking_number = $2, shipped_at = NOW()
         WHERE id = $3`,
        ['shipped', fulfillment_data.tracking_number, order_id]
      );
      
      // Create fulfillment record
      const fulfillmentResult = await client.query(
        `INSERT INTO fulfillments (order_id, carrier, tracking_number, status, created_at)
         VALUES ($1, $2, $3, 'shipped', NOW()) RETURNING *`,
        [order_id, fulfillment_data.carrier, fulfillment_data.tracking_number]
      );
      
      await client.query('COMMIT');
      
      return fulfillmentResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  async processPayroll({ period_start, period_end, staff_ids }) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Calculate payroll for each staff member
      const payrollRecords = [];
      
      for (const staff_id of staff_ids) {
        // Get hours worked
        const hoursResult = await client.query(
          `SELECT SUM(total_minutes) / 60.0 as total_hours
           FROM schedule
           WHERE staff_id = $1 
           AND start_time BETWEEN $2 AND $3
           AND status = 'completed'`,
          [staff_id, period_start, period_end]
        );
        
        const totalHours = parseFloat(hoursResult.rows[0]?.total_hours || 0);
        
        // Get hourly rate
        const rateResult = await client.query(
          'SELECT hourly_rate FROM staff WHERE id = $1',
          [staff_id]
        );
        
        const hourlyRate = parseFloat(rateResult.rows[0]?.hourly_rate || 0);
        const grossPay = totalHours * hourlyRate;
        
        // Create payroll record
        const payrollResult = await client.query(
          `INSERT INTO payroll (
            staff_id, period_start, period_end, hours_worked, 
            hourly_rate, gross_pay, status, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
          RETURNING *`,
          [staff_id, period_start, period_end, totalHours, hourlyRate, grossPay]
        );
        
        payrollRecords.push(payrollResult.rows[0]);
      }
      
      await client.query('COMMIT');
      
      return {
        period_start,
        period_end,
        records: payrollRecords,
        total_records: payrollRecords.length
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new WorkflowService();

