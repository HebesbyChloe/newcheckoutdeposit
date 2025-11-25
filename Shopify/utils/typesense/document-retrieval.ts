/**
 * Direct Document Retrieval for Typesense Gateway
 * Uses the new direct retrieval endpoints for better performance on detail pages
 */

import { buildDocumentRetrievalUrl, extractBaseUrl, CollectionType } from './gateway-utils';
import { TypesenseHit, TypesenseDiamondDocument } from '@/types/typesense.types';

/**
 * Gateway document retrieval response format
 * Different from search response - returns single document
 */
export interface GatewayDocumentResponse {
  feed: string;
  document: {
    id: string;
    item_id?: string;
    [key: string]: unknown;
  };
}

/**
 * Retrieve a single document by ID using direct retrieval endpoint
 * This is more efficient than searching with filters
 * 
 * @param documentId - The document ID to retrieve
 * @param collection - Collection type ('natural' or 'labgrown')
 * @param baseUrl - Base gateway URL (without /search/ paths)
 * @param apiKey - Gateway API key
 * @returns Gateway document response or error
 */
export async function retrieveDocumentById(
  documentId: string,
  collection: CollectionType,
  baseUrl: string,
  apiKey: string
): Promise<{ data: GatewayDocumentResponse } | { error: string; status: number; detail: unknown }> {
  const url = buildDocumentRetrievalUrl(baseUrl, collection, documentId);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      
      return {
        error: 'typesense_error',
        status: response.status,
        detail: {
          message: errorData.message || errorData.error || 'Unknown error',
          status: response.status,
          statusText: response.statusText,
          documentId,
          collection,
          gatewayUrl: url,
          gatewayResponse: errorData,
          timestamp: new Date().toISOString(),
        },
      };
    }

    const data = await response.json() as GatewayDocumentResponse;
    return { data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        error: 'typesense_error',
        status: 504,
        detail: {
          message: 'Request timeout',
          error: 'AbortError',
          timeout: '10 seconds',
          documentId,
          collection,
          timestamp: new Date().toISOString(),
        },
      };
    }

    return {
      error: 'typesense_error',
      status: 502,
      detail: {
        message: errorMessage,
        error: error instanceof Error ? error.name : 'Unknown',
        documentId,
        collection,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

/**
 * Retrieve document with fallback to search if direct retrieval fails
 * 
 * @param documentId - The document ID to retrieve
 * @param collection - Collection type ('natural' | 'labgrown')
 * @param baseUrl - Base gateway URL
 * @param apiKey - Gateway API key
 * @param fallbackSearch - Function to perform fallback search (optional)
 * @returns Document data or error
 */
export async function retrieveDocumentWithFallback(
  documentId: string,
  collection: CollectionType,
  baseUrl: string,
  apiKey: string,
  fallbackSearch?: (itemId: string, collection: CollectionType) => Promise<unknown>
): Promise<{ data: GatewayDocumentResponse } | { error: string; status: number; detail: unknown }> {
  // Try direct retrieval first
  const result = await retrieveDocumentById(documentId, collection, baseUrl, apiKey);
  
  // If direct retrieval succeeds, return it
  if ('data' in result) {
    return result;
  }
  
  // If 404, try fallback search if provided
  if (result.status === 404 && fallbackSearch) {
    try {
      const searchResult = await fallbackSearch(documentId, collection);
      // Transform search result to match document response format if needed
      return { data: searchResult as GatewayDocumentResponse };
    } catch (searchError) {
      // If fallback also fails, return original error
      return result;
    }
  }
  
  // Return original error for non-404 cases or if no fallback
  return result;
}

/**
 * Transform gateway document response to match TypesenseHit structure
 * This allows compatibility with existing transformers
 * 
 * Gateway response format:
 * {
 *   "feed": "natural",
 *   "document": {
 *     "id": "510014688",
 *     "item_id": "510014688",
 *     "raw": { "...full document..." }
 *   }
 * }
 * 
 * @param response - Gateway document response
 * @returns Transformed hit structure compatible with TypesenseHit
 */
export function transformDocumentToHit(response: GatewayDocumentResponse): TypesenseHit {
  const doc = response.document;
  
  // The document may have normalized fields at top level or in raw
  // Check both locations for compatibility
  const rawDoc = (doc.raw as TypesenseDiamondDocument) || (doc as unknown as TypesenseDiamondDocument);
  
  return {
    id: String(doc.id || doc.item_id || ''),
    itemId: String(doc.item_id || doc.id || ''),
    carat: typeof doc.carat === 'number' ? doc.carat : (typeof doc.carat === 'string' ? doc.carat : parseFloat(String(doc.carat || rawDoc.Carat || 0))),
    color: String(doc.color || rawDoc.Color || ''),
    clarity: String(doc.clarity || rawDoc.Clarity || ''),
    cut: String(doc.cut || rawDoc.Cut || rawDoc.Shape || ''),
    cutGrade: String(doc.cut_grade || doc.cutGrade || rawDoc['Cut Grade'] || rawDoc.Cut_Grade || ''),
    pricePerCarat: typeof doc.price_per_carat === 'number' ? doc.price_per_carat : parseFloat(String(doc.price_per_carat || rawDoc['Price Per Carat'] || 0)),
    totalPrice: typeof doc.total_price === 'number' ? doc.total_price : parseFloat(String(doc.total_price || rawDoc['Total Price'] || 0)),
    updatedAt: typeof doc.updated_at === 'number' ? doc.updated_at : (typeof rawDoc.updated_at === 'number' ? rawDoc.updated_at : Date.now()),
    raw: rawDoc,
  };
}

