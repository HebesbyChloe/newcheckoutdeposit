/**
 * Centralized Error Handling Utilities
 * Standardizes error handling across the application
 */

import { NextResponse } from 'next/server';
import { TypesenseError, GatewayError, NotFoundError, TypesenseErrorDetails } from '@/types/errors';

/**
 * Error context for logging
 */
export interface ErrorContext {
  itemId?: string;
  collection?: 'natural' | 'labgrown';
  endpoint?: string;
  url?: string;
  [key: string]: unknown;
}

/**
 * Standard error response format
 */
export interface StandardErrorResponse {
  error: string;
  message: string;
  details?: TypesenseErrorDetails;
  timestamp: string;
}

/**
 * Handle gateway errors and convert to appropriate error types
 */
export function handleGatewayError(error: unknown, context: ErrorContext = {}): GatewayError | TypesenseError {
  if (error instanceof GatewayError || error instanceof TypesenseError) {
    return error;
  }

  if (error instanceof Error) {
    // Check if it's a known error with details
    if ((error as any).details) {
      const details = (error as any).details as TypesenseErrorDetails;
      const status = (error as any).status as number | undefined;

      if (status === 404) {
        return new NotFoundError(
          context.itemId || details.itemId || 'unknown',
          context.collection || details.collection,
          context.endpoint || details.endpoint
        );
      }

      if (status) {
        return new GatewayError(error.message, status, { ...details, ...context });
      }

      return new TypesenseError(error.message, { ...details, ...context });
    }

    // Generic error
    return new TypesenseError(error.message, context);
  }

  // Unknown error type
  const message = typeof error === 'string' ? error : 'Unknown error occurred';
  return new TypesenseError(message, context);
}

/**
 * Format error as NextResponse with standard structure
 */
export function formatErrorResponse(error: GatewayError | TypesenseError | Error): NextResponse<StandardErrorResponse> {
  let status = 500;
  let errorMessage = 'Internal server error';
  let details: TypesenseErrorDetails | undefined;

  if (error instanceof GatewayError) {
    status = error.status;
    errorMessage = error.message;
    details = error.details;
  } else if (error instanceof TypesenseError) {
    status = 502; // Bad Gateway for Typesense errors
    errorMessage = error.message;
    details = error.details;
  } else if (error instanceof Error) {
    errorMessage = error.message;
    // Check for embedded details
    if ((error as any).details) {
      details = (error as any).details;
      if ((error as any).status) {
        status = (error as any).status;
      }
    }
  }

  const response: StandardErrorResponse = {
    error: error.name || 'Error',
    message: errorMessage,
    details,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, { status });
}

/**
 * Log error with structured context
 */
export function logError(error: Error, context: string, additionalContext: ErrorContext = {}): void {
  const errorDetails: Record<string, unknown> = {
    message: error.message,
    name: error.name,
    context,
    ...additionalContext,
  };

  if (error instanceof GatewayError || error instanceof TypesenseError) {
    errorDetails.details = error.details;
    if (error instanceof GatewayError) {
      errorDetails.status = error.status;
    }
  }

  if ((error as any).details) {
    errorDetails.embeddedDetails = (error as any).details;
  }

  console.error(`❌ [${context}] Error:`, errorDetails);

  if (error.stack) {
    console.error('Stack trace:', error.stack);
  }
}

