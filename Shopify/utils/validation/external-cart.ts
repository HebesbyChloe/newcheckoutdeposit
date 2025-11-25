// Validation utilities for external cart
import { ExternalCartAddRequest, SourceType } from '@/types/external-cart.types';

const VALID_SOURCE_TYPES: SourceType[] = ['labgrown', 'natural', 'moissanite', 'coloredstone', 'custom'];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateExternalCartRequest(request: any): ValidationResult {
  const errors: string[] = [];

  if (!request) {
    return {
      valid: false,
      errors: ['Request body is required'],
    };
  }

  if (!request.external_id || typeof request.external_id !== 'string' || request.external_id.trim() === '') {
    errors.push('external_id is required and must be a non-empty string');
  }

  if (!request.source_type || typeof request.source_type !== 'string') {
    errors.push('source_type is required and must be a string');
  } else if (!VALID_SOURCE_TYPES.includes(request.source_type)) {
    errors.push(`source_type must be one of: ${VALID_SOURCE_TYPES.join(', ')}`);
  }

  if (!request.title || typeof request.title !== 'string' || request.title.trim() === '') {
    errors.push('title is required and must be a non-empty string');
  }

  if (request.price === undefined || request.price === null) {
    errors.push('price is required');
  } else if (typeof request.price !== 'number' || request.price < 0) {
    errors.push('price must be a non-negative number');
  }

  if (request.image !== undefined && (typeof request.image !== 'string' || request.image.trim() === '')) {
    errors.push('image must be a non-empty string if provided');
  }

  if (request.payload !== undefined && (typeof request.payload !== 'object' || Array.isArray(request.payload))) {
    errors.push('payload must be an object if provided');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

