/**
 * Type Guards for Typesense Gateway Integration
 * Runtime validation for Typesense data structures
 */

import { TypesenseHit } from '@/types/typesense.types';
import { GatewaySearchResponse } from '@/types/typesense.types';
import { GatewayDocumentResponse } from './document-retrieval';

/**
 * Type guard for TypesenseHit
 */
export function isTypesenseHit(value: unknown): value is TypesenseHit {
  if (!value || typeof value !== 'object') {
    return false;
  }
  
  const hit = value as Record<string, unknown>;
  return (
    typeof hit.id === 'string' &&
    typeof hit.itemId === 'string' &&
    typeof hit.raw === 'object' &&
    hit.raw !== null
  );
}

/**
 * Type guard for GatewaySearchResponse
 */
export function isGatewaySearchResponse(value: unknown): value is GatewaySearchResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }
  
  const response = value as Record<string, unknown>;
  return (
    Array.isArray(response.hits) &&
    (response.total === undefined || typeof response.total === 'number')
  );
}

/**
 * Type guard for GatewayDocumentResponse
 */
export function isGatewayDocumentResponse(value: unknown): value is GatewayDocumentResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }
  
  const response = value as Record<string, unknown>;
  return (
    typeof response.feed === 'string' &&
    typeof response.document === 'object' &&
    response.document !== null &&
    typeof (response.document as Record<string, unknown>).id === 'string'
  );
}

/**
 * Type guard for collection type
 */
export function isValidCollection(value: string): value is 'natural' | 'labgrown' {
  return value === 'natural' || value === 'labgrown';
}

