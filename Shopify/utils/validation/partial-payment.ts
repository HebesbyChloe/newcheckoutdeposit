// Validation utilities for partial payment
import { DepositSessionCreateRequest } from '@/types/partial-payment.types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateDepositSessionRequest(request: any): ValidationResult {
  const errors: string[] = [];

  if (!request) {
    return {
      valid: false,
      errors: ['Request body is required'],
    };
  }

  if (request.customer_id !== undefined && (typeof request.customer_id !== 'string' || request.customer_id.trim() === '')) {
    errors.push('customer_id must be a non-empty string if provided');
  }

  if (!Array.isArray(request.items) || request.items.length === 0) {
    errors.push('items is required and must be a non-empty array');
  } else {
    request.items.forEach((item: any, index: number) => {
      if (!item.variantId || typeof item.variantId !== 'string') {
        errors.push(`items[${index}].variantId is required and must be a string`);
      }
      if (item.quantity === undefined || typeof item.quantity !== 'number' || item.quantity < 1) {
        errors.push(`items[${index}].quantity is required and must be a positive number`);
      }
    });
  }

  if (request.total_amount === undefined || request.total_amount === null) {
    errors.push('total_amount is required');
  } else if (typeof request.total_amount !== 'number' || request.total_amount <= 0) {
    errors.push('total_amount must be a positive number');
  }

  if (request.deposit_amount === undefined || request.deposit_amount === null) {
    errors.push('deposit_amount is required');
  } else if (typeof request.deposit_amount !== 'number' || request.deposit_amount <= 0) {
    errors.push('deposit_amount must be a positive number');
  } else if (request.deposit_amount >= request.total_amount) {
    errors.push('deposit_amount must be less than total_amount');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

