import { NextRequest, NextResponse } from 'next/server';
import { TypesenseSearchResponse } from '@/types/typesense.types';
import axios from 'axios';
import { extractBaseUrl, validateCollection, getEndpoint, buildGatewayUrl } from '@/utils/typesense/gateway-utils';

/**
 * Get a single diamond by itemId from Typesense external feed
 */
// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> | { itemId: string } }
) {
  // Declare variables outside try block for catch block access
  let itemId = '';
  let trimmedItemId = '';
  let validCollection: 'natural' | 'labgrown' = 'labgrown';
  
  try {
    const resolvedParams = params instanceof Promise ? await params : params;
    itemId = resolvedParams.itemId;

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    const gatewayBaseUrl = process.env.TYPESENSE_GATEWAY_URL;
    const apiKey = process.env.TYPESENSE_GATEWAY_API_KEY;

    if (!gatewayBaseUrl || !apiKey) {
      console.error('❌ Missing Typesense Gateway configuration');
      return NextResponse.json(
        { error: 'Typesense Gateway not configured' },
        { status: 500 }
      );
    }

    // Get collection parameter from query string (natural or labgrown), default to 'labgrown'
    const searchParams = request.nextUrl.searchParams;
    const collection = searchParams.get('collection');
    validCollection = validateCollection(collection);
    const endpoint = getEndpoint(validCollection);
    
    // Extract base URL from gatewayBaseUrl (should be base URL only, without /search/ paths)
    // The extractBaseUrl function handles legacy cases where /search/... might be included
    const baseUrl = extractBaseUrl(gatewayBaseUrl);

    // Trim itemId
    const trimmedItemId = itemId.trim();

    // Search for the specific item by itemId
    // Try multiple strategies: filter_by with different field names, then search with itemId as query
    async function searchWithFilter(filterField: string | null, useItemIdAsQuery: boolean = false): Promise<any> {
      const strategyName = filterField 
        ? `filter_by: ${filterField}` 
        : (useItemIdAsQuery ? 'query by itemId' : 'no filter');
        
      const queryString = new URLSearchParams({
        q: useItemIdAsQuery ? trimmedItemId : '*', // Use itemId as query if specified
        query_by: useItemIdAsQuery ? 'itemId,id,Item ID #' : 'title,description', // Search in itemId fields if using as query
        per_page: '50', // Get more results when searching without filter
        page: '1',
        sort_by: 'updated_at:desc',
      });
      
      if (filterField) {
        // Try different filter syntaxes
        queryString.set('filter_by', `${filterField}:='${trimmedItemId}'`);
      }

      // Build full gateway URL: base URL + /search/{endpoint} + query params
      const url = buildGatewayUrl(baseUrl, endpoint, queryString);

      try {
        const response = await axios.get(url, {
          headers: {
            'X-API-Key': apiKey || '',
            'Content-Type': 'application/json',
          },
          timeout: 10000, // 10 seconds
        });

        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const errorData = error.response?.data || { message: error.message || 'Unknown error' };
          const status = error.response?.status || 500;
          const statusText = error.response?.statusText || 'Internal Server Error';
          
          // Build detailed error response
          const detailedError = {
            message: typeof errorData === 'object' ? (errorData.message || errorData.error || 'Unknown error') : String(errorData),
            status,
            statusText,
            strategy: strategyName,
            itemId: trimmedItemId,
            collection: validCollection,
            gatewayResponse: typeof errorData === 'object' ? errorData : { message: String(errorData) },
            url: url.substring(0, 200),
            timestamp: new Date().toISOString(),
          };
          
          if (status === 404) {
            return { 
              error: 'typesense_error', 
              detail: {
                message: 'Diamond not found',
                itemId: trimmedItemId,
                collection: validCollection,
                strategy: strategyName,
                gatewayResponse: typeof errorData === 'object' ? errorData : { message: String(errorData) },
                status: 404,
              }, 
              status: 404 
            };
          }

          return { error: 'typesense_error', detail: detailedError, status };
        }
        
        // Non-Axios error
        return {
          error: 'typesense_error',
          detail: {
            message: error instanceof Error ? error.message : 'Unknown error',
            strategy: strategyName,
            itemId: trimmedItemId,
            collection: validCollection,
            url: url.substring(0, 200),
            timestamp: new Date().toISOString(),
          },
          status: 500,
        };
      }
    }

    // Try different search strategies
    let gatewayData: any = null;
    // Strategy order: filter by id, filter by itemId, search with itemId as query, search without filter
    const strategies: Array<{ filterField: string | null; useItemIdAsQuery: boolean }> = [
      { filterField: 'id', useItemIdAsQuery: false },
      { filterField: 'itemId', useItemIdAsQuery: false },
      { filterField: 'Item ID #', useItemIdAsQuery: false }, // Try with space
      { filterField: null, useItemIdAsQuery: true }, // Search with itemId as query string
      { filterField: null, useItemIdAsQuery: false }, // Last resort: get all and filter in JS
    ];
    
    for (const strategy of strategies) {
      const result = await searchWithFilter(strategy.filterField, strategy.useItemIdAsQuery);
      
      if (result.error) {
        if (strategy === strategies[strategies.length - 1]) {
          // Last strategy failed, return error
          console.error('❌ [API ROUTE] All search strategies failed');
          return NextResponse.json(result.detail, { status: result.status });
        }
        continue; // Try next strategy
      }
      
      gatewayData = result;
      
      // Check if we got results
      if (gatewayData.hits && gatewayData.hits.length > 0) {
        break;
      }
    }

    if (!gatewayData || !gatewayData.hits || gatewayData.hits.length === 0) {
      console.error('❌ All search strategies failed for itemId:', trimmedItemId);
      return NextResponse.json(
        { error: 'Diamond not found', itemId: trimmedItemId, details: 'No results from any search strategy' },
        { status: 404 }
      );
    }

    // Transform gateway response to match our TypesenseHit structure
    // Gateway spec shows normalized snake_case: item_id, price_per_carat, total_price, cut_grade
    const transformedHits = gatewayData.hits?.map((hit: any) => {
      return {
        id: hit.id || hit.item_id || hit['Item ID #'] || '',
        itemId: hit.itemId || hit.item_id || hit['Item ID #'] || hit.id || '',
        carat: hit.carat || hit.Carat || 0,
        color: hit.color || hit.Color || '',
        clarity: hit.clarity || hit.Clarity || '',
        cut: hit.cut || hit.Cut || hit.shape || hit.Shape || '', // Shape (Round, Oval, etc.)
        cutGrade: hit.cutGrade || hit.cut_grade || hit['Cut Grade'] || hit.Cut_Grade || '', // Cut grade (Fair, Good, etc.)
        pricePerCarat: hit.pricePerCarat || hit.price_per_carat || hit['Price Per Carat'] || 0,
        totalPrice: hit.totalPrice || hit.total_price || hit['Total Price'] || 0,
        updatedAt: hit.updatedAt || hit.updated_at || Date.now(),
        raw: hit.raw || hit,
      };
    }) || [];

    // Filter to find exact match on itemId (in case search returned multiple or filter didn't work)
    // Check multiple possible field locations including raw document
    const exactMatch = transformedHits.find(
      (hit: any) => {
        // Check normalized fields
        const hitItemId = String(hit.itemId || hit.id || '');
        const requestedItemId = String(trimmedItemId);
        
        // Also check raw document for Item ID # field
        const rawItemId = String(
          hit.raw?.['Item ID #'] || 
          hit.raw?.itemId || 
          hit.raw?.id || 
          hit.raw?.['item_id'] ||
          ''
        );
        
        const matches = hitItemId === requestedItemId || rawItemId === requestedItemId;
        return matches;
      }
    );

    if (transformedHits.length === 0) {
      console.error('❌ No hits returned from gateway for itemId:', trimmedItemId);
      console.error('Gateway response:', JSON.stringify(gatewayData, null, 2).substring(0, 500));
      return NextResponse.json(
        { error: 'Diamond not found', itemId: trimmedItemId, details: 'No results from gateway' },
        { status: 404 }
      );
    }

    // Use exact match if found, otherwise use first hit and log a warning
    const matchedHit = exactMatch || transformedHits[0];

    if (!matchedHit) {
      console.error('❌ No matching hit found for itemId:', trimmedItemId);
      return NextResponse.json(
        { error: 'Diamond not found', itemId: trimmedItemId },
        { status: 404 }
      );
    }

    // Log if we didn't get an exact match (filter might not be working)
    if (!exactMatch && transformedHits.length > 0) {
      console.warn('⚠️ Filter did not find exact match, using first result. ItemId:', trimmedItemId, 'Found:', matchedHit.itemId || matchedHit.id);
    }

    const data: TypesenseSearchResponse = {
      total: 1,
      page: 1,
      per_page: 1,
      hits: [matchedHit], // Return only the matched hit
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error fetching diamond from Typesense:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Handle timeout errors
    if (axios.isAxiosError(error) && (error.code === 'ECONNABORTED' || error.message.includes('timeout'))) {
      return NextResponse.json(
        { 
          error: 'typesense_error', 
          detail: { 
            message: 'Request timeout',
            error: 'Timeout',
            timeout: '10 seconds',
            itemId: itemId,
            collection: validCollection,
            timestamp: new Date().toISOString(),
          }
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { 
        error: 'typesense_error', 
        detail: { 
          message: errorMessage,
          error: error instanceof Error ? error.name : 'Unknown',
          stack: error instanceof Error ? error.stack : undefined,
          itemId: itemId,
          collection: validCollection,
          timestamp: new Date().toISOString(),
        }
      },
      { status: 502 }
    );
  }
}
