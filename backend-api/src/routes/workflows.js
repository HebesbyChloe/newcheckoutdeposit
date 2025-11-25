const express = require('express');
const router = express.Router();
const workflowService = require('../services/workflowService');
const axios = require('axios');

// Helper function to submit job to worker service
async function submitToWorker(tenant_id, job_type, job_data) {
  const workerServiceURL = process.env.WORKER_SERVICE_URL || 'https://worker-service-dfcflow.fly.dev';
  
  try {
    const response = await axios.post(`${workerServiceURL}/jobs`, {
      tenant_id,
      job_type,
      job_data,
      max_retries: 3
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to submit job to worker: ${error.message}`);
  }
}

// Refund workflow
router.post('/refund', async (req, res, next) => {
  try {
    const { order_id, items, reason, async: useAsync } = req.body;
    const tenant_id = req.body.tenant_id || req.headers['x-tenant-id'];
    
    // If async flag is set, submit to worker service
    if (useAsync && tenant_id) {
      const job = await submitToWorker(tenant_id, 'workflow', {
        workflow_type: 'refund',
        order_id,
        items,
        reason
      });
      
      return res.json({
        job_id: job.job_id,
        status: job.status,
        message: 'Refund job submitted to worker service'
      });
    }
    
    // Otherwise, process synchronously
    const result = await workflowService.processRefund({
      order_id,
      items,
      reason
    });
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Order fulfillment workflow
router.post('/fulfill', async (req, res, next) => {
  try {
    const { order_id, fulfillment_data, async: useAsync } = req.body;
    const tenant_id = req.body.tenant_id || req.headers['x-tenant-id'];
    
    // If async flag is set, submit to worker service
    if (useAsync && tenant_id) {
      const job = await submitToWorker(tenant_id, 'workflow', {
        workflow_type: 'fulfillment',
        order_id,
        fulfillment_data
      });
      
      return res.json({
        job_id: job.job_id,
        status: job.status,
        message: 'Fulfillment job submitted to worker service'
      });
    }
    
    // Otherwise, process synchronously
    const result = await workflowService.processFulfillment({
      order_id,
      fulfillment_data
    });
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Payroll processing workflow
router.post('/payroll/process', async (req, res, next) => {
  try {
    const { period_start, period_end, staff_ids, async: useAsync } = req.body;
    const tenant_id = req.body.tenant_id || req.headers['x-tenant-id'];
    
    // If async flag is set, submit to worker service
    if (useAsync && tenant_id) {
      const job = await submitToWorker(tenant_id, 'workflow', {
        workflow_type: 'payroll',
        period_start,
        period_end,
        staff_ids
      });
      
      return res.json({
        job_id: job.job_id,
        status: job.status,
        message: 'Payroll job submitted to worker service'
      });
    }
    
    // Otherwise, process synchronously
    const result = await workflowService.processPayroll({
      period_start,
      period_end,
      staff_ids
    });
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

