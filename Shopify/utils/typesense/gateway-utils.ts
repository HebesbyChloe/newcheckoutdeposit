/**
 * Typesense Gateway Utility Functions
 * Centralized utilities for interacting with the Typesense API Gateway
 */

export type CollectionType = 'natural' | 'labgrown';

/**
 * Extract base URL from gateway URL, removing any existing /search/... paths
 * Handles cases where TYPESENSE_GATEWAY_URL might already include /search/natural or /search/products
 * 
 * @param gatewayUrl - The gateway URL (may include /search/... paths)
 * @returns Clean base URL without /search/ paths
 * 
 * @example
 * extractBaseUrl('https://api-gateway.com/search/natural') // 'https://api-gateway.com'
 * extractBaseUrl('https://api-gateway.com/') // 'https://api-gateway.com'
 */
export function extractBaseUrl(gatewayUrl: string): string {
  let baseUrl = gatewayUrl.replace(/\/+$/, ''); // Remove trailing slashes
  
  // Remove any existing /search/... path from the base URL
  // e.g., https://api-gateway.../search/natural -> https://api-gateway...
  const searchPathMatch = baseUrl.match(/^(.+?)(\/search\/[^\/]+)?$/);
  if (searchPathMatch && searchPathMatch[1]) {
    baseUrl = searchPathMatch[1];
  }
  
  return baseUrl;
}

/**
 * Map collection type to gateway endpoint
 * 
 * @param collection - Collection type ('natural' or 'labgrown')
 * @returns Endpoint string ('natural' or 'labgrown')
 */
export function getEndpoint(collection: CollectionType): string {
  return collection === 'natural' ? 'natural' : 'labgrown';
}

/**
 * Build full gateway URL for search requests
 * 
 * @param baseUrl - Base gateway URL (without /search/ paths)
 * @param endpoint - Endpoint ('natural' or 'labgrown')
 * @param params - URL search parameters
 * @returns Full gateway URL with query string
 */
export function buildGatewayUrl(
  baseUrl: string,
  endpoint: string,
  params: URLSearchParams
): string {
  return `${baseUrl}/search/${endpoint}?${params.toString()}`;
}

/**
 * Build gateway URL for direct document retrieval
 * 
 * @param baseUrl - Base gateway URL (without /search/ paths)
 * @param collection - Collection type ('natural' or 'labgrown')
 * @param documentId - Document ID to retrieve
 * @returns Full gateway URL for document retrieval
 * 
 * @example
 * buildDocumentRetrievalUrl('https://api-gateway.com', 'natural', '510014688')
 * // Returns: 'https://api-gateway.com/search/natural/510014688'
 */
export function buildDocumentRetrievalUrl(
  baseUrl: string,
  collection: CollectionType,
  documentId: string
): string {
  const endpoint = getEndpoint(collection);
  return `${baseUrl}/search/${endpoint}/${documentId}`;
}

/**
 * Validate and normalize collection parameter
 * 
 * @param collection - Collection string from query parameter (may be null)
 * @returns Normalized collection type ('natural' or 'labgrown')
 * @default 'labgrown' if collection is null or invalid
 */
export function validateCollection(collection: string | null): CollectionType {
  return collection === 'natural' ? 'natural' : 'labgrown';
}

