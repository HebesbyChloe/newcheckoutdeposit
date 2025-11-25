const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

class OrderService {
  async calculateOrderTotal({ orderItems, discounts = [], shipping = 0, tax = 0 }) {
    // Calculate subtotal
    let subtotal = orderItems.reduce((sum, item) => {
      return sum + (item.quantity * item.price);
    }, 0);
    
    // Apply discounts
    let discountAmount = 0;
    for (const discount of discounts) {
      if (discount.type === 'percentage') {
        discountAmount += subtotal * (discount.value / 100);
      } else if (discount.type === 'fixed') {
        discountAmount += discount.value;
      }
    }
    
    const afterDiscount = subtotal - discountAmount;
    
    // Calculate tax if not provided
    if (tax === 0 && process.env.TAX_RATE) {
      tax = afterDiscount * (parseFloat(process.env.TAX_RATE) / 100);
    }
    
    // Calculate total
    const total = afterDiscount + shipping + tax;
    
    return {
      subtotal,
      discountAmount,
      afterDiscount,
      shipping,
      tax,
      total,
      breakdown: {
        items: orderItems.length,
        discounts: discounts.length
      }
    };
  }
  
  async validateInventory(orderItems) {
    const results = [];
    
    for (const item of orderItems) {
      const query = 'SELECT qty, name_product FROM stock WHERE product_sku = $1';
      const result = await pool.query(query, [item.sku]);
      
      if (result.rows.length === 0) {
        results.push({
          sku: item.sku,
          available: false,
          error: 'Product not found'
        });
      } else {
        const available = result.rows[0].qty;
        results.push({
          sku: item.sku,
          requested: item.quantity,
          available,
          sufficient: available >= item.quantity
        });
      }
    }
    
    return results;
  }
}

module.exports = new OrderService();

