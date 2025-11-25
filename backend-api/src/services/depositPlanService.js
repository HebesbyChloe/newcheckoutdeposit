const { Pool } = require('pg');

let pool;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });
} else {
  console.warn('WARNING: DATABASE_URL not set in depositPlanService. Deposit plan operations will fail.');
}

class DepositPlanService {
  /**
   * Get all active deposit plans
   */
  async getAllActivePlans() {
    if (!pool) {
      throw { code: 'DATABASE_NOT_CONFIGURED', message: 'Database connection not configured.' };
    }

    const result = await pool.query(
      `SELECT * FROM deposit_plans WHERE active = true ORDER BY is_default DESC, name ASC`
    );

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      percentage: row.percentage ? parseFloat(row.percentage) : null,
      fixedAmount: row.fixed_amount ? parseFloat(row.fixed_amount) : null,
      numberOfInstalments: row.total_installments || row.number_of_instalments || 1,
      number_of_instalments: row.total_installments || row.number_of_instalments || 1,
      total_installments: row.total_installments || row.number_of_instalments || 1,
      minDeposit: row.min_deposit ? parseFloat(row.min_deposit) : null,
      maxDeposit: row.max_deposit ? parseFloat(row.max_deposit) : null,
      isDefault: row.is_default,
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  /**
   * Get deposit plan by ID
   */
  async getPlanById(planId) {
    if (!pool) {
      throw { code: 'DATABASE_NOT_CONFIGURED', message: 'Database connection not configured.' };
    }

    const result = await pool.query(
      `SELECT * FROM deposit_plans WHERE id = $1`,
      [planId]
    );

    if (result.rows.length === 0) {
      throw { code: 'PLAN_NOT_FOUND', message: 'Deposit plan not found' };
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      percentage: row.percentage ? parseFloat(row.percentage) : null,
      fixedAmount: row.fixed_amount ? parseFloat(row.fixed_amount) : null,
      numberOfInstalments: row.total_installments || row.number_of_instalments || 1,
      number_of_instalments: row.total_installments || row.number_of_instalments || 1,
      total_installments: row.total_installments || row.number_of_instalments || 1,
      minDeposit: row.min_deposit ? parseFloat(row.min_deposit) : null,
      maxDeposit: row.max_deposit ? parseFloat(row.max_deposit) : null,
      isDefault: row.is_default,
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Get default deposit plan
   */
  async getDefaultPlan() {
    if (!pool) {
      throw { code: 'DATABASE_NOT_CONFIGURED', message: 'Database connection not configured.' };
    }

    const result = await pool.query(
      `SELECT * FROM deposit_plans WHERE is_default = true AND active = true LIMIT 1`
    );

    if (result.rows.length === 0) {
      // Fallback to first active plan
      const allPlans = await this.getAllActivePlans();
      if (allPlans.length === 0) {
        throw { code: 'NO_PLANS_AVAILABLE', message: 'No active deposit plans found' };
      }
      return allPlans[0];
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      percentage: row.percentage ? parseFloat(row.percentage) : null,
      fixedAmount: row.fixed_amount ? parseFloat(row.fixed_amount) : null,
      numberOfInstalments: row.total_installments || row.number_of_instalments || 1,
      number_of_instalments: row.total_installments || row.number_of_instalments || 1,
      total_installments: row.total_installments || row.number_of_instalments || 1,
      minDeposit: row.min_deposit ? parseFloat(row.min_deposit) : null,
      maxDeposit: row.max_deposit ? parseFloat(row.max_deposit) : null,
      isDefault: row.is_default,
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Calculate payment amounts based on plan and total amount
   * @param {Object} plan - Deposit plan object
   * @param {number} totalAmount - Total cart amount
   * @returns {Array<number>} Array of payment amounts
   */
  calculatePaymentAmounts(plan, totalAmount) {
    const amounts = [];
    
    // Get number of instalments - support total_installments, number_of_instalments, and numberOfInstalments
    const numberOfInstalments = plan.total_installments || plan.numberOfInstalments || plan.number_of_instalments || 1;
    
    // Calculate first payment
    let firstAmount;
    if (plan.type === 'PERCENTAGE') {
      if (!plan.percentage) {
        throw { code: 'INVALID_PLAN', message: 'Percentage plan must have percentage value' };
      }
      firstAmount = totalAmount * (plan.percentage / 100);
    } else if (plan.type === 'FIXED') {
      if (!plan.fixedAmount && !plan.fixed_amount) {
        throw { code: 'INVALID_PLAN', message: 'Fixed plan must have fixed_amount value' };
      }
      firstAmount = plan.fixedAmount || plan.fixed_amount;
    } else {
      throw { code: 'INVALID_PLAN', message: `Unsupported plan type: ${plan.type}` };
    }

    // Ensure first amount doesn't exceed total
    if (firstAmount > totalAmount) {
      firstAmount = totalAmount;
    }

    // Calculate remaining amount
    const remaining = totalAmount - firstAmount;
    const remainingPayments = numberOfInstalments - 1;

    // If only one payment, return just the first amount
    if (remainingPayments <= 0) {
      return [firstAmount];
    }

    // Split remaining amount equally across remaining payments
    const remainingAmountPerPayment = remaining / remainingPayments;

    amounts.push(firstAmount);
    for (let i = 0; i < remainingPayments; i++) {
      amounts.push(remainingAmountPerPayment);
    }

    console.log(`Calculated ${amounts.length} payment amounts for plan with ${numberOfInstalments} instalments:`, amounts);
    return amounts;
  }
}

module.exports = new DepositPlanService();

