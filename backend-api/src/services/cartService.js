const { Pool } = require('pg');

let pool;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });
} else {
  console.warn('WARNING: DATABASE_URL not set. Cart operations will fail.');
}

class CartService {
  async addItemToCart({ cartId, source, externalId, variantId, productId, productHandle, title, imageUrl, price, quantity, attributes, payload, customerId }) {
    if (!pool) {
      throw { code: 'DATABASE_NOT_CONFIGURED', message: 'Database connection not configured. Please set DATABASE_URL in environment variables.' };
    }
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Generate cart ID if not provided
      if (!cartId) {
        cartId = `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // Check which columns exist in carts table
      const columnCheck = await client.query(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_name = 'carts' 
         AND column_name IN ('id_tenant', 'total_amount', 'id_store')`
      );
      const existingColumns = columnCheck.rows.map(r => r.column_name);
      const hasTenantId = existingColumns.includes('id_tenant');
      const hasTotalAmount = existingColumns.includes('total_amount');
      const hasStoreId = existingColumns.includes('id_store');
      
      // Build INSERT columns and values dynamically
      const insertColumns = ['id', 'customer_id', 'total_quantity', 'status'];
      const insertValues = [cartId, customerId || null, quantity, 'active'];
      let paramIndex = insertValues.length;
      
      if (hasTenantId) {
        insertColumns.push('id_tenant');
        insertValues.push(3); // id_tenant = 3
        paramIndex++;
      }
      
      if (hasTotalAmount) {
        insertColumns.push('total_amount');
        insertValues.push(0); // Will be calculated after items are added
        paramIndex++;
      }
      
      if (hasStoreId) {
        insertColumns.push('id_store');
        insertValues.push(null);
        paramIndex++;
      }
      
      insertColumns.push('created_at', 'updated_at');
      
      const placeholders = [];
      for (let i = 0; i < paramIndex; i++) {
        placeholders.push(`$${i + 1}`);
      }
      placeholders.push('NOW()', 'NOW()');
      
      // Build UPDATE clause for ON CONFLICT
      const updateClause = ['customer_id = COALESCE(EXCLUDED.customer_id, carts.customer_id)'];
      if (hasTotalAmount) {
        updateClause.push('total_amount = COALESCE(EXCLUDED.total_amount, carts.total_amount)');
      }
      updateClause.push('updated_at = NOW()');
      
      const cartResult = await client.query(
        `INSERT INTO carts (${insertColumns.join(', ')})
         VALUES (${placeholders.join(', ')})
         ON CONFLICT (id) DO UPDATE SET
           ${updateClause.join(', ')}
         RETURNING *`,
        insertValues
      );
      
      const cart = cartResult.rows[0];
      
      // Check business rule: prevent duplicate externalIds in the same cart
      // If same externalId exists, update quantity; if different, allow as new line item
      if (source === 'external' && externalId) {
        const existingItem = await client.query(
          `SELECT id, external_id FROM cart_items WHERE cart_id = $1 AND source = 'external' AND external_id = $2`,
          [cartId, externalId]
        );
        
        if (existingItem.rows.length > 0) {
          // Same externalId - update quantity instead of creating duplicate
          const item = existingItem.rows[0];
          await client.query(
            `UPDATE cart_items SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2`,
            [quantity, item.id]
          );
          
          // Recalculate cart totals (quantity and amount)
          const totalsResult = await client.query(
            `SELECT 
              COALESCE(SUM(quantity), 0) as total_quantity,
              COALESCE(SUM(price_amount * quantity), 0) as total_amount
             FROM cart_items WHERE cart_id = $1`,
            [cartId]
          );
          const totalQuantity = parseInt(totalsResult.rows[0].total_quantity);
          const totalAmount = parseFloat(totalsResult.rows[0].total_amount);
          
          // Check if total_amount column exists
          const totalAmountCheck = await client.query(
            `SELECT column_name 
             FROM information_schema.columns 
             WHERE table_name = 'carts' AND column_name = 'total_amount'`
          );
          const hasTotalAmountCol = totalAmountCheck.rows.length > 0;
          
          // Update cart with totals
          const updateColumns = ['total_quantity = $1', 'updated_at = NOW()'];
          const updateValues = [totalQuantity];
          let updateParamIndex = 2;
          
          if (hasTotalAmountCol) {
            updateColumns.push(`total_amount = $${updateParamIndex}`);
            updateValues.push(totalAmount);
            updateParamIndex++;
          }
          
          await client.query(
            `UPDATE carts SET ${updateColumns.join(', ')} WHERE id = $${updateParamIndex}`,
            [...updateValues, cartId]
          );
          
          await client.query('COMMIT');
          
          // Return updated cart
          return await this.getCart(cartId);
        }
        // Different externalId (or no existing item) - continue to add as new line item below
      }
      
      // Create cart item
      const lineId = `line_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      // Check if product_id column exists, if not we'll use variant_id column for productId
      await client.query(
        `INSERT INTO cart_items (
          id, cart_id, source, variant_id, external_id, product_handle, title, 
          image_url, price_amount, price_currency, quantity, attributes, payload
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          lineId, cartId, source, productId || variantId || null, externalId || null,
          productHandle, title, imageUrl, price.amount, price.currencyCode,
          quantity, JSON.stringify(attributes || []), JSON.stringify(payload || {})
        ]
      );
      
      // Recalculate cart totals (quantity and amount)
      const totalsResult = await client.query(
        `SELECT 
          COALESCE(SUM(quantity), 0) as total_quantity,
          COALESCE(SUM(price_amount * quantity), 0) as total_amount
         FROM cart_items WHERE cart_id = $1`,
        [cartId]
      );
      const totalQuantity = parseInt(totalsResult.rows[0].total_quantity);
      const totalAmount = parseFloat(totalsResult.rows[0].total_amount);
      
      // Check if total_amount column exists
      const totalAmountCheck = await client.query(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_name = 'carts' AND column_name = 'total_amount'`
      );
      const hasTotalAmountCol = totalAmountCheck.rows.length > 0;
      
      // Update cart with totals
      const updateColumns = ['total_quantity = $1', 'updated_at = NOW()'];
      const updateValues = [totalQuantity];
      let updateParamIndex = 2;
      
      if (hasTotalAmountCol) {
        updateColumns.push(`total_amount = $${updateParamIndex}`);
        updateValues.push(totalAmount);
        updateParamIndex++;
      }
      
      await client.query(
        `UPDATE carts SET ${updateColumns.join(', ')} WHERE id = $${updateParamIndex}`,
        [...updateValues, cartId]
      );
      
      await client.query('COMMIT');
      
      // Get full cart with items
      return await this.getCart(cartId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  async getCart(cartId) {
    if (!pool) {
      throw { code: 'DATABASE_NOT_CONFIGURED', message: 'Database connection not configured.' };
    }
    const cartResult = await pool.query(
      `SELECT * FROM carts WHERE id = $1`,
      [cartId]
    );
    
    if (cartResult.rows.length === 0) {
      throw { code: 'CART_NOT_FOUND', message: 'Cart not found' };
    }
    
    const cart = cartResult.rows[0];
    
    const itemsResult = await pool.query(
      `SELECT 
        id, source, variant_id, external_id, product_handle, title, image_url,
        price_amount, price_currency, quantity, attributes, payload
       FROM cart_items WHERE cart_id = $1`,
      [cartId]
    );
    
    const lines = itemsResult.rows.map(row => ({
      id: row.id,
      source: row.source,
      productId: row.variant_id, // Using variant_id column to store productId (since we're not using variants)
      variantId: null, // No variants, always null
      externalId: row.external_id,
      title: row.title,
      imageUrl: row.image_url,
      price: {
        amount: row.price_amount,
        currencyCode: row.price_currency
      },
      quantity: row.quantity,
      attributes: row.attributes ? (typeof row.attributes === 'string' ? JSON.parse(row.attributes) : row.attributes) : [],
      payload: row.payload ? (typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload) : null
    }));
    
    // Calculate totals from lines
    let subtotal = 0;
    let currency = 'USD';
    if (lines.length > 0) {
      subtotal = lines.reduce((sum, line) => {
        if (line.price && line.price.amount) {
          return sum + (parseFloat(line.price.amount) * line.quantity);
        }
        return sum;
      }, 0);
      currency = lines[0].price?.currencyCode || 'USD';
    }
    
    // Parse total_amount from DB (DECIMAL comes as string)
    const dbTotalAmount = cart.total_amount ? parseFloat(cart.total_amount) : null;
    const finalTotalAmount = dbTotalAmount !== null && !isNaN(dbTotalAmount) ? dbTotalAmount : subtotal;
    
    return {
      id: cart.id,
      customerId: cart.customer_id,
      totalQuantity: cart.total_quantity,
      totalAmount: finalTotalAmount,
      lines,
      cost: {
        subtotalAmount: {
          amount: finalTotalAmount.toFixed(2),
          currencyCode: currency
        },
        totalAmount: {
          amount: finalTotalAmount.toFixed(2),
          currencyCode: currency
        },
        totalTaxAmount: null,
        totalDutyAmount: null
      }
    };
  }
  
  async updateLineQuantity(cartId, lineId, quantity) {
    if (!pool) {
      throw { code: 'DATABASE_NOT_CONFIGURED', message: 'Database connection not configured.' };
    }
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      await client.query(
        `UPDATE cart_items SET quantity = $1 WHERE id = $2 AND cart_id = $3`,
        [quantity, lineId, cartId]
      );
      
      // Recalculate cart totals (quantity and amount)
      const totalsResult = await client.query(
        `SELECT 
          COALESCE(SUM(quantity), 0) as total_quantity,
          COALESCE(SUM(price_amount * quantity), 0) as total_amount
         FROM cart_items WHERE cart_id = $1`,
        [cartId]
      );
      const totalQuantity = parseInt(totalsResult.rows[0].total_quantity);
      const totalAmount = parseFloat(totalsResult.rows[0].total_amount);
      
      // Check if total_amount column exists
      const columnCheck = await client.query(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_name = 'carts' AND column_name = 'total_amount'`
      );
      const hasTotalAmount = columnCheck.rows.length > 0;
      
      // Update cart with totals
      const updateColumns = ['total_quantity = $1', 'updated_at = NOW()'];
      const updateValues = [totalQuantity];
      let updateParamIndex = 2;
      
      if (hasTotalAmount) {
        updateColumns.push(`total_amount = $${updateParamIndex}`);
        updateValues.push(totalAmount);
        updateParamIndex++;
      }
      
      await client.query(
        `UPDATE carts SET ${updateColumns.join(', ')} WHERE id = $${updateParamIndex}`,
        [...updateValues, cartId]
      );
      
      await client.query('COMMIT');
      
      return await this.getCart(cartId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  async removeLine(cartId, lineId) {
    if (!pool) {
      throw { code: 'DATABASE_NOT_CONFIGURED', message: 'Database connection not configured.' };
    }
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      await client.query(
        `DELETE FROM cart_items WHERE id = $1 AND cart_id = $2`,
        [lineId, cartId]
      );
      
      // Recalculate cart totals (quantity and amount)
      const totalsResult = await client.query(
        `SELECT 
          COALESCE(SUM(quantity), 0) as total_quantity,
          COALESCE(SUM(price_amount * quantity), 0) as total_amount
         FROM cart_items WHERE cart_id = $1`,
        [cartId]
      );
      const totalQuantity = parseInt(totalsResult.rows[0].total_quantity);
      const totalAmount = parseFloat(totalsResult.rows[0].total_amount);
      
      // Check if total_amount column exists
      const columnCheck = await client.query(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_name = 'carts' AND column_name = 'total_amount'`
      );
      const hasTotalAmount = columnCheck.rows.length > 0;
      
      // Update cart with totals
      const updateColumns = ['total_quantity = $1', 'updated_at = NOW()'];
      const updateValues = [totalQuantity];
      let updateParamIndex = 2;
      
      if (hasTotalAmount) {
        updateColumns.push(`total_amount = $${updateParamIndex}`);
        updateValues.push(totalAmount);
        updateParamIndex++;
      }
      
      if (totalQuantity === 0) {
        updateColumns.push(`status = 'empty'`);
      }
      
      await client.query(
        `UPDATE carts SET ${updateColumns.join(', ')} WHERE id = $${updateParamIndex}`,
        [...updateValues, cartId]
      );
      
      await client.query('COMMIT');
      
      return await this.getCart(cartId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new CartService();

