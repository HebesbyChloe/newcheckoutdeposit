/**
 * Error Types for Typesense Gateway Integration
 * Structured error types for better error handling and debugging
 */

/**
 * Typesense-specific error details
 */
export interface TypesenseErrorDetails {
  itemId?: string;
  collection?: 'natural' | 'labgrown';
  endpoint?: string;
  gatewayUrl?: string;
  gatewayResponse?: unknown;
  strategy?: string;
  [key: string]: unknown;
}

/**
 * Typesense error extending standard Error
 */
export class TypesenseError extends Error {
  details: TypesenseErrorDetails;

  constructor(message: string, details: TypesenseErrorDetails = {}) {
    super(message);
    this.name = 'TypesenseError';
    this.details = details;
    Object.setPrototypeOf(this, TypesenseError.prototype);
  }
}

/**
 * Gateway error for API gateway issues
 */
export class GatewayError extends Error {
  status: number;
  details: TypesenseErrorDetails;

  constructor(message: string, status: number, details: TypesenseErrorDetails = {}) {
    super(message);
    this.name = 'GatewayError';
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, GatewayError.prototype);
  }
}

/**
 * Not found error for 404 cases
 */
export class NotFoundError extends GatewayError {
  constructor(itemId: string, collection?: 'natural' | 'labgrown', endpoint?: string) {
    super(
      `Diamond not found: ${itemId}`,
      404,
      {
        itemId,
        collection,
        endpoint,
        message: 'No exact match found in search results',
      }
    );
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Error factory functions
 */

/**
 * Create a Typesense error with details
 */
export function createTypesenseError(
  message: string,
  details: TypesenseErrorDetails = {}
): TypesenseError {
  return new TypesenseError(message, details);
}

/**
 * Create a not found error
 */
export function createNotFoundError(
  itemId: string,
  collection?: 'natural' | 'labgrown',
  endpoint?: string
): NotFoundError {
  return new NotFoundError(itemId, collection, endpoint);
}

/**
 * Create a gateway error
 */
export function createGatewayError(
  message: string,
  status: number,
  details: TypesenseErrorDetails = {}
): GatewayError {
  return new GatewayError(message, status, details);
}

/**
 * External Cart Error
 */
export class ExternalCartError extends Error {
  details: {
    externalId?: string;
    sourceType?: string;
    productId?: string;
    variantId?: string;
    [key: string]: unknown;
  };

  constructor(message: string, details: { externalId?: string; sourceType?: string; productId?: string; variantId?: string; [key: string]: unknown } = {}) {
    super(message);
    this.name = 'ExternalCartError';
    this.details = details;
    Object.setPrototypeOf(this, ExternalCartError.prototype);
  }
}

/**
 * Partial Payment Error
 */
export class PartialPaymentError extends Error {
  details: {
    sessionId?: string;
    orderId?: string;
    amount?: number;
    [key: string]: unknown;
  };

  constructor(message: string, details: { sessionId?: string; orderId?: string; amount?: number; [key: string]: unknown } = {}) {
    super(message);
    this.name = 'PartialPaymentError';
    this.details = details;
    Object.setPrototypeOf(this, PartialPaymentError.prototype);
  }
}

/**
 * Deposit Session Error
 */
export class DepositSessionError extends Error {
  details: {
    sessionId?: string;
    expired?: boolean;
    [key: string]: unknown;
  };

  constructor(message: string, details: { sessionId?: string; expired?: boolean; [key: string]: unknown } = {}) {
    super(message);
    this.name = 'DepositSessionError';
    this.details = details;
    Object.setPrototypeOf(this, DepositSessionError.prototype);
  }
}

