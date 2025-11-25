const { Pool } = require('pg');
const shopifyService = require('./shopifyService');
const cartService = require('./cartService');
const depositPlanService = require('./depositPlanService');

let pool;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });
} else {
  console.warn('WARNING: DATABASE_URL not set in depositService. Deposit operations will fail.');
}

class DepositService {
  async createDepositSession({ cartId, customerId, lines, totalAmount, depositAmount, planId }) {
    if (!pool) {
      throw { code: 'DATABASE_NOT_CONFIGURED', message: 'Database connection not configured.' };
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Load cart if lines not provided
      let cartLines = lines;
      let cartData = null;
      if (!cartLines) {
        cartData = await cartService.getCart(cartId);
        cartLines = cartData.lines.map(line => ({
          variantId: line.variantId || line.productId,
          quantity: line.quantity,
          title: line.title,
          price: line.price,
          imageUrl: line.imageUrl
        }));
        if (!totalAmount) {
          totalAmount = cartData.lines.reduce((sum, line) => {
            return sum + (parseFloat(line.price.amount) * line.quantity);
          }, 0);
        }
      }
      
      // Load deposit plan
      let plan;
      if (planId) {
        plan = await depositPlanService.getPlanById(planId);
      } else {
        plan = await depositPlanService.getDefaultPlan();
      }
      
      // Ensure we have number_of_instalments - support total_installments, number_of_instalments, and numberOfInstalments
      const numberOfInstalments = plan.total_installments || plan.numberOfInstalments || plan.number_of_instalments || 1;
      console.log(`Plan loaded: ${plan.id}, type: ${plan.type}, total_installments/number_of_instalments: ${numberOfInstalments}`);
      
      // Calculate payment amounts based on plan
      const paymentAmounts = depositPlanService.calculatePaymentAmounts(plan, totalAmount);
      
      // Verify we have the correct number of payments
      if (paymentAmounts.length !== numberOfInstalments) {
        console.warn(`Warning: Payment amounts count (${paymentAmounts.length}) doesn't match number_of_instalments (${numberOfInstalments})`);
      }
      
      console.log(`Will create ${paymentAmounts.length} draft orders for ${numberOfInstalments} instalments`);
      
      // Get deposit product ID
      const depositProductId = process.env.SHOPIFY_DEPOSIT_PRODUCT_ID;
      if (!depositProductId) {
        throw { code: 'DEPOSIT_PRODUCT_NOT_CONFIGURED', message: 'SHOPIFY_DEPOSIT_PRODUCT_ID is not configured' };
      }
      
      // Create deposit session
      const sessionId = `deposit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1); // 24 hours
      
      // Create all draft orders (one per payment)
      const draftOrderIds = [];
      const checkoutUrls = [];
      
      for (let i = 0; i < paymentAmounts.length; i++) {
        const paymentAmount = paymentAmounts[i];
        const paymentNumber = i + 1;
        
        // Create deposit variant for this payment
        const depositVariantId = await shopifyService.createDepositVariant(
          depositProductId,
          paymentAmount,
          sessionId,
          paymentNumber
        );
        
        // Prepare cart items data for metafield
        const cartItemsForMetafield = cartLines.map(line => ({
          variantId: line.variantId,
          productId: line.productId,
          title: line.title,
          price: line.price,
          imageUrl: line.imageUrl,
          quantity: line.quantity
        }));
        
        // Create metafield with all cart items and plan details
        // Ensure numberOfInstalments is available (fallback to paymentAmounts.length)
        const totalPayments = plan.numberOfInstalments || plan.number_of_instalments || paymentAmounts.length;
        
        const depositMetafield = {
          session_id: sessionId,
          plan_id: plan.id,
          plan_name: plan.name,
          plan_type: plan.type,
          payment_number: paymentNumber,
          total_payments: totalPayments,
          payment_amount: paymentAmount,
          total_amount: totalAmount,
          cart_items: cartItemsForMetafield
        };
        
        // Create draft order with only the deposit variant
        // Ensure numberOfInstalments is available (fallback to paymentAmounts.length)
        const totalPaymentsForLog = plan.numberOfInstalments || plan.number_of_instalments || paymentAmounts.length;
        console.log(`Creating draft order ${paymentNumber} of ${totalPaymentsForLog} for session ${sessionId}...`);
        let draftOrderId;
        try {
          draftOrderId = await shopifyService.createDraftOrder({
            customerId,
            lines: [{
              variantId: depositVariantId,
              quantity: 1
            }],
            totalAmount: paymentAmount,
            customAttributes: [
              { key: 'custom.deposit', value: JSON.stringify(depositMetafield) }
            ]
          });
          console.log(`Successfully created draft order ${paymentNumber}: ${draftOrderId}`);
        } catch (draftError) {
          console.error(`Failed to create draft order ${paymentNumber}:`, draftError);
          throw draftError; // Re-throw to abort the transaction
        }
        
        draftOrderIds.push(draftOrderId);
        
        // Create Storefront cart for first payment to get checkout URL
        if (paymentNumber === 1) {
          try {
            // Ensure numberOfInstalments is available (fallback to paymentAmounts.length)
            const totalPayments = plan.numberOfInstalments || plan.number_of_instalments || paymentAmounts.length;
            
            const cartResult = await shopifyService.createStorefrontCart([{
              merchandiseId: depositVariantId,
              quantity: 1,
              attributes: [
                { key: 'deposit_session_id', value: sessionId },
                { key: 'payment_number', value: String(paymentNumber) },
                { key: 'total_payments', value: String(totalPayments) }
              ]
            }]);
            
            if (cartResult && cartResult.checkoutUrl) {
              checkoutUrls.push(cartResult.checkoutUrl);
            } else {
              console.warn('Storefront cart created but no checkoutUrl returned');
            }
          } catch (error) {
            console.warn('Failed to create Storefront cart for first payment:', error.message);
            console.error('Storefront cart creation error details:', error);
            // Continue even if Storefront cart creation fails - we can create it later
          }
        }
      }
      
      // Prepare cart items data for items column
      const itemsData = cartLines.map(line => ({
        variantId: line.variantId,
        productId: line.productId,
        title: line.title,
        price: line.price,
        imageUrl: line.imageUrl,
        quantity: line.quantity
      }));
      
      // Create 1 row in deposit_sessions table
      console.log(`Creating 1 deposit session row with ${numberOfInstalments} installments...`);
      
      const depositSessionColumns = [
        'session_id',
        'id_tenant',
        'id_store',
        'cart_id',
        'customer_id',
        'plan_id',
        'items',
        'total_amount',
        'payment_status',
        'total_installments',
        'paid_installments',
        'checkout_url',
        'expires_at',
        'created_at'
      ];
      
      const depositSessionValues = [
        sessionId,                    // session_id
        3,                            // id_tenant
        8,                            // id_store
        cartId,                       // cart_id
        customerId,                   // customer_id
        plan.id,                      // plan_id
        JSON.stringify(itemsData),     // items (JSONB)
        totalAmount,                  // total_amount
        'pending_deposit',            // payment_status
        numberOfInstalments,          // total_installments
        0,                            // paid_installments
        checkoutUrls.length > 0 ? checkoutUrls[0] : null, // checkout_url (first payment)
        expiresAt,                    // expires_at
        'NOW()'                       // created_at
      ];
      
      // Build placeholders - handle NOW() separately
      const depositSessionPlaceholders = [];
      const depositSessionQueryValues = [];
      let valueIndex = 1;
      
      for (let i = 0; i < depositSessionValues.length; i++) {
        if (depositSessionValues[i] === 'NOW()') {
          depositSessionPlaceholders.push('NOW()');
        } else {
          depositSessionPlaceholders.push(`$${valueIndex}`);
          depositSessionQueryValues.push(depositSessionValues[i]);
          valueIndex++;
        }
      }
      
      await client.query(
        `INSERT INTO deposit_sessions (${depositSessionColumns.join(', ')})
         VALUES (${depositSessionPlaceholders.join(', ')})`,
        depositSessionQueryValues
      );
      
      console.log(`Successfully created deposit session: ${sessionId}`);
      
      // Create payment_schedules rows (one per draft order)
      console.log(`Creating ${draftOrderIds.length} payment schedule rows...`);
      
      for (let i = 0; i < draftOrderIds.length; i++) {
        const draftOrderId = draftOrderIds[i];
        const paymentAmount = paymentAmounts[i];
        const installmentNumber = i + 1;
        const installmentType = installmentNumber === 1 ? 'deposit' : 'installment';
        
        const paymentScheduleColumns = [
          'id_tenant',
          'id_store',
          'session_id',
          'installment_number',
          'installment_type',
          'amount',
          'shopify_draft_order_id',
          'checkout_url',
          'status',
          'due_date',
          'created_at',
          'updated_at'
        ];
        
        const paymentScheduleValues = [
          3,                                    // id_tenant
          8,                                    // id_store
          sessionId,                             // session_id
          installmentNumber,                     // installment_number
          installmentType,                       // installment_type
          paymentAmount,                         // amount
          draftOrderId,                         // shopify_draft_order_id
          installmentNumber === 1 && checkoutUrls.length > 0 ? checkoutUrls[0] : null, // checkout_url (only for first)
          'pending',                            // status
          null,                                 // due_date (NULL for now)
          'NOW()',                             // created_at
          'NOW()'                              // updated_at
        ];
        
        // Build placeholders - handle NOW() separately
        const paymentSchedulePlaceholders = [];
        const paymentScheduleQueryValues = [];
        let paymentValueIndex = 1;
        
        for (let j = 0; j < paymentScheduleValues.length; j++) {
          if (paymentScheduleValues[j] === 'NOW()') {
            paymentSchedulePlaceholders.push('NOW()');
          } else {
            paymentSchedulePlaceholders.push(`$${paymentValueIndex}`);
            paymentScheduleQueryValues.push(paymentScheduleValues[j]);
            paymentValueIndex++;
          }
        }
        
        await client.query(
          `INSERT INTO payment_schedules (${paymentScheduleColumns.join(', ')})
           VALUES (${paymentSchedulePlaceholders.join(', ')})`,
          paymentScheduleQueryValues
        );
        
        console.log(`Created payment schedule row ${installmentNumber}: ${installmentType} - $${paymentAmount} (draft order: ${draftOrderId})`);
      }
      
      console.log(`Successfully created ${draftOrderIds.length} payment schedule rows`);
      
      await client.query('COMMIT');
      
      const result = { 
        session_id: sessionId,
        draft_order_ids: draftOrderIds,
        first_draft_order_id: draftOrderIds[0],
        checkout_url: checkoutUrls.length > 0 ? checkoutUrls[0] : null,
        payment_amounts: paymentAmounts
      };
      
      console.log(`Deposit session created successfully:`, {
        sessionId,
        numberOfDraftOrders: draftOrderIds.length,
        hasCheckoutUrl: !!result.checkout_url,
        paymentAmounts: paymentAmounts
      });
      
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating deposit session:', error);
      // Re-throw with more context if it's not already an error object
      if (error.code) {
        throw error;
      } else {
        throw { 
          code: 'DEPOSIT_SESSION_CREATION_FAILED', 
          message: error.message || 'Failed to create deposit session',
          details: error.stack
        };
      }
    } finally {
      client.release();
    }
  }
  
  async getDepositSession(sessionId) {
    const result = await pool.query(
      `SELECT * FROM deposit_sessions WHERE session_id = $1`,
      [sessionId]
    );
    
    if (result.rows.length === 0) {
      throw { code: 'SESSION_NOT_FOUND', message: 'Deposit session not found' };
    }
    
    const session = result.rows[0];
    
    // Get payment schedules for this session
    const paymentSchedulesResult = await pool.query(
      `SELECT * FROM payment_schedules WHERE session_id = $1 ORDER BY installment_number`,
      [sessionId]
    );
    
    return {
      session_id: session.session_id,
      cart_id: session.cart_id,
      customer_id: session.customer_id,
      plan_id: session.plan_id,
      items: session.items,
      total_amount: parseFloat(session.total_amount),
      payment_status: session.payment_status,
      total_installments: session.total_installments,
      paid_installments: session.paid_installments,
      checkout_url: session.checkout_url,
      created_at: session.created_at,
      expires_at: session.expires_at,
      payment_schedules: paymentSchedulesResult.rows.map(row => ({
        id: row.id,
        installment_number: row.installment_number,
        installment_type: row.installment_type,
        amount: parseFloat(row.amount),
        shopify_draft_order_id: row.shopify_draft_order_id,
        checkout_url: row.checkout_url,
        status: row.status,
        due_date: row.due_date,
        paid_amount: parseFloat(row.paid_amount),
        paid_at: row.paid_at
      }))
    };
  }
  
  async createCheckoutForDeposit(sessionId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const sessionResult = await pool.query(
        `SELECT * FROM deposit_sessions WHERE session_id = $1`,
        [sessionId]
      );
      
      if (sessionResult.rows.length === 0) {
        throw { code: 'SESSION_NOT_FOUND', message: 'Deposit session not found' };
      }
      
      const session = sessionResult.rows[0];
      
      // Create deposit variant on dedicated product
      const depositProductId = process.env.SHOPIFY_DEPOSIT_PRODUCT_ID;
      if (!depositProductId) {
        throw { code: 'DEPOSIT_PRODUCT_NOT_CONFIGURED', message: 'SHOPIFY_DEPOSIT_PRODUCT_ID is not configured' };
      }
      const depositVariantId = await shopifyService.createDepositVariant(
        depositProductId,
        parseFloat(session.deposit_amount),
        sessionId,
        1 // Payment number 1 for legacy flow
      );
      
      // Create Storefront cart with deposit variant
      const checkoutUrl = await shopifyService.createStorefrontCart([{
        merchandiseId: depositVariantId,
        quantity: 1,
        attributes: [
          { key: 'deposit_session_id', value: sessionId },
          { key: 'deposit_summary', value: JSON.stringify({
            total: session.total_amount,
            deposit: session.deposit_amount,
            remaining: session.remaining_amount
          })}
        ]
      }]);
      
      // Update session with checkout URL
      await client.query(
        `UPDATE deposit_sessions SET checkout_url = $1 WHERE session_id = $2`,
        [checkoutUrl, sessionId]
      );
      
      await client.query('COMMIT');
      
      return { checkoutUrl };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  async completeDepositOrder(sessionId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const sessionResult = await pool.query(
        `SELECT * FROM deposit_sessions WHERE session_id = $1`,
        [sessionId]
      );
      
      if (sessionResult.rows.length === 0) {
        throw { code: 'SESSION_NOT_FOUND', message: 'Deposit session not found' };
      }
      
      const session = sessionResult.rows[0];
      
      // Complete Draft Order -> real Order
      const orderId = await shopifyService.completeDraftOrder(session.draft_order_id);
      
      // Record deposit transaction
      await shopifyService.recordDepositTransaction(orderId, session.deposit_amount);
      
      // Write partial payment metafields
      await shopifyService.updateOrderMetafields(orderId, {
        'partial.deposit_amount': session.deposit_amount,
        'partial.remaining_amount': session.remaining_amount,
        'partial.payment_status': 'partial_paid',
        'partial.deposit_session_id': sessionId
      });
      
      // Create payment link for remaining amount
      const paymentLink = await shopifyService.createPaymentLink(orderId, session.remaining_amount);
      
      await shopifyService.updateOrderMetafields(orderId, {
        'partial.payment_link': paymentLink
      });
      
      // Store payment record
      await pool.query(
        `INSERT INTO payments (order_id, type, amount, status, created_at)
         VALUES ($1, 'DEPOSIT', $2, 'completed', NOW())`,
        [orderId, session.deposit_amount]
      );
      
      await client.query('COMMIT');
      
      return {
        orderId,
        paymentLink
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new DepositService();

