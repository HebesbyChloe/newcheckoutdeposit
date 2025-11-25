/**
 * Search Strategy Utilities for Typesense Gateway
 * Used as fallback when direct document retrieval fails
 */

import { buildGatewayUrl, extractBaseUrl, getEndpoint, CollectionType } from './gateway-utils';

/**
 * Search strategy configuration
 */
export interface SearchStrategy {
  filterField: string | null;
  useItemIdAsQuery: boolean;
}

/**
 * Gateway search response (from search endpoint)
 */
export interface GatewaySearchResponse {
  total?: number;
  page?: number;
  per_page?: number;
  hits?: Array<{
    id: string;
    itemId?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

/**
 * Get default search strategies for finding a document by itemId
 * Strategies are ordered from most specific to least specific
 */
export function getDefaultStrategies(): SearchStrategy[] {
  return [
    { filterField: 'id', useItemIdAsQuery: false },
    { filterField: 'itemId', useItemIdAsQuery: false },
    { filterField: 'Item ID #', useItemIdAsQuery: false }, // Try with space
    { filterField: null, useItemIdAsQuery: true }, // Search with itemId as query string
    { filterField: null, useItemIdAsQuery: false }, // Last resort: get all and filter in JS
  ];
}

/**
 * Execute a single search strategy
 * 
 * @param strategy - Search strategy to execute
 * @param itemId - Item ID to search for
 * @param collection - Collection type
 * @param baseUrl - Base gateway URL
 * @param apiKey - Gateway API key
 * @returns Search response or error
 */
export async function executeSearchStrategy(
  strategy: SearchStrategy,
  itemId: string,
  collection: CollectionType,
  baseUrl: string,
  apiKey: string
): Promise<{ data: GatewaySearchResponse } | { error: string; status: number; detail: unknown }> {
  const endpoint = getEndpoint(collection);
  const queryString = new URLSearchParams({
    q: strategy.useItemIdAsQuery ? itemId : '*',
    query_by: strategy.useItemIdAsQuery ? 'itemId,id,Item ID #' : 'title,description',
    per_page: '50',
    page: '1',
    sort_by: 'updated_at:desc',
  });

  if (strategy.filterField) {
    queryString.set('filter_by', `${strategy.filterField}:='${itemId}'`);
  }

  const url = buildGatewayUrl(baseUrl, endpoint, queryString);
  const strategyName = strategy.filterField 
    ? `filter_by: ${strategy.filterField}` 
    : (strategy.useItemIdAsQuery ? 'query by itemId' : 'no filter');

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
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
          strategy: strategyName,
          itemId,
          collection,
          gatewayResponse: errorData,
          url: url.substring(0, 200),
          timestamp: new Date().toISOString(),
        },
      };
    }

    const data = await response.json() as GatewaySearchResponse;
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
          strategy: strategyName,
          itemId,
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
        strategy: strategyName,
        itemId,
        collection,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

/**
 * Try all search strategies until one succeeds
 * 
 * @param itemId - Item ID to search for
 * @param collection - Collection type
 * @param baseUrl - Base gateway URL
 * @param apiKey - Gateway API key
 * @param strategies - Array of strategies to try (defaults to getDefaultStrategies())
 * @returns First successful search response or last error
 */
export async function searchWithStrategies(
  itemId: string,
  collection: CollectionType,
  baseUrl: string,
  apiKey: string,
  strategies: SearchStrategy[] = getDefaultStrategies()
): Promise<{ data: GatewaySearchResponse; strategy: SearchStrategy } | { error: string; status: number; detail: unknown }> {
  for (const strategy of strategies) {
    const result = await executeSearchStrategy(strategy, itemId, collection, baseUrl, apiKey);
    
    if ('error' in result) {
      // If this is the last strategy, return the error
      if (strategy === strategies[strategies.length - 1]) {
        return result;
      }
      // Otherwise, continue to next strategy
      continue;
    }
    
    // Check if we got results
    if (result.data.hits && result.data.hits.length > 0) {
      return { ...result, strategy };
    }
  }

  // If we get here, all strategies returned no results
  return {
    error: 'typesense_error',
    status: 404,
    detail: {
      message: 'No results from any search strategy',
      itemId,
      collection,
      strategiesTried: strategies.length,
      timestamp: new Date().toISOString(),
    },
  };
}

