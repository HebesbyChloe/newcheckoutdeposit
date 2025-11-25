import { NextRequest, NextResponse } from 'next/server';
import { TypesenseSearchResponse, TypesenseSearchParams } from '@/types/typesense.types';
import axios from 'axios';
import { extractBaseUrl, buildGatewayUrl, validateCollection, getEndpoint } from '@/utils/typesense/gateway-utils';

/**
 * Proxy route for Typesense API Gateway
 * Handles authentication and passes through query parameters
 */
export async function GET(request: NextRequest) {
  try {
    const gatewayUrl = process.env.TYPESENSE_GATEWAY_URL;
    const apiKey = process.env.TYPESENSE_GATEWAY_API_KEY;

    if (!gatewayUrl || !apiKey) {
      console.error('❌ Missing Typesense Gateway configuration');
      return NextResponse.json(
        { error: 'Typesense Gateway not configured' },
        { status: 500 }
      );
    }

    // Extract query parameters with defaults
    const searchParams = request.nextUrl.searchParams;
    
    // Get collection parameter (natural or labgrown), default to 'labgrown'
    const collection = searchParams.get('collection');
    const validCollection = validateCollection(collection);
    const endpoint = getEndpoint(validCollection);
    
    const params: TypesenseSearchParams = {
      q: searchParams.get('q') || '*',
      query_by: searchParams.get('query_by') || 'title,description',
      per_page: parseInt(searchParams.get('per_page') || '10', 10),
      page: parseInt(searchParams.get('page') || '1', 10),
      sort_by: searchParams.get('sort_by') || 'updated_at:desc',
      filter_by: searchParams.get('filter_by') || undefined,
    };

    // Build query string
    const queryString = new URLSearchParams();
    queryString.set('q', params.q!);
    queryString.set('query_by', params.query_by!);
    queryString.set('per_page', String(params.per_page));
    queryString.set('page', String(params.page));
    queryString.set('sort_by', params.sort_by!);
    if (params.filter_by) {
      queryString.set('filter_by', params.filter_by);
    }

    // Extract base URL from gatewayUrl (should be base URL only, without /search/ paths)
    // The extractBaseUrl function handles legacy cases where /search/... might be included
    const baseUrl = extractBaseUrl(gatewayUrl);
    
    // Build full gateway URL: base URL + /search/{endpoint} + query params
    const url = buildGatewayUrl(baseUrl, endpoint, queryString);

    const startTime = Date.now();

    // Retry logic for 502/503 errors (gateway/server issues)
    const maxRetries = 3;
    const retryDelay = 1000; // Start with 1 second
    let lastError: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Make request to Typesense Gateway using axios
        const response = await axios.get(url, {
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 10000, // 10 second timeout
        });

        const latency = Date.now() - startTime;
        const gatewayData = response.data;

        // Transform gateway response to match our TypesenseHit structure
        // Gateway returns normalized fields per spec: item_id, price_per_carat, total_price, cut_grade
        const transformedHits = gatewayData.hits?.map((hit: any) => {
          // Map fields from gateway response to TypesenseHit format
          // Gateway spec shows normalized snake_case: item_id, price_per_carat, total_price
          // Also extract cut_grade separately from cut (shape)
          // Keep full document in raw for fallback lookups (including image URLs)
          const rawDoc = hit.raw || hit;
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
            raw: rawDoc, // Keep full document in raw for fallback lookups
          };
        }) || [];

        const data: TypesenseSearchResponse = {
          total: gatewayData.total || 0,
          page: gatewayData.page || 1,
          per_page: gatewayData.per_page || gatewayData.perPage || 10,
          hits: transformedHits,
        };

        return NextResponse.json(data);
      } catch (error) {
        lastError = error;
        
        if (axios.isAxiosError(error)) {
          const status = error.response?.status || 500;
          
          // Retry on 502 (Bad Gateway) or 503 (Service Unavailable) - these are temporary server issues
          if ((status === 502 || status === 503) && attempt < maxRetries) {
            const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff: 1s, 2s, 4s
            if (process.env.NODE_ENV !== 'production') {
              console.warn(`⚠️ Gateway returned ${status}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})...`);
            }
            await new Promise(resolve => setTimeout(resolve, delay));
            continue; // Retry
          }
          
          // If not retryable or max retries reached, return error
          const latency = Date.now() - startTime;
          const errorData = error.response?.data || { message: error.message || 'Unknown error' };
          const statusText = error.response?.statusText || 'Internal Server Error';
          
          // Build detailed error response
          const detailedError = {
            message: typeof errorData === 'object' ? (errorData.message || errorData.error || 'Unknown error') : String(errorData),
            status,
            statusText,
            gatewayBaseUrl: baseUrl,
            gatewayUrl: url,
            collection: validCollection,
            endpoint,
            gatewayResponse: typeof errorData === 'object' ? errorData : { message: String(errorData) },
            latency,
            attempts: attempt + 1,
            timestamp: new Date().toISOString(),
          };
          
          console.error('❌ Typesense Gateway Error:', detailedError);
          console.error('❌ Full Gateway URL that was called:', url);
          console.error('❌ Gateway base URL from env:', baseUrl);
          console.error('❌ Endpoint used:', endpoint);

          // Handle specific error cases
          if (status === 404 || status === 401) {
            // Typesense/PostgREST returns 404/401 for invalid path or API key
            return NextResponse.json(
              { 
                error: 'typesense_error', 
                detail: {
                  message: status === 401 ? 'Authentication failed or invalid path' : 'Diamond not found',
                  status,
                  gatewayBaseUrl: baseUrl,
                  gatewayUrl: url,
                  endpoint: endpoint,
                  collection: validCollection,
                  gatewayResponse: typeof errorData === 'object' ? errorData : { message: String(errorData) },
                }
              },
              { status }
            );
          }

          return NextResponse.json(
            { error: 'typesense_error', detail: detailedError },
            { status: status === 502 || status === 503 ? status : 502 }
          );
        }
        
        // Handle timeout errors
        if (lastError instanceof Error && (lastError.name === 'AbortError' || lastError.message.includes('timeout'))) {
          const latency = Date.now() - startTime;
          return NextResponse.json(
            { 
              error: 'typesense_error', 
              detail: { 
                message: 'Request timeout',
                error: 'Timeout',
                timeout: '10 seconds',
                url: baseUrl ? `${baseUrl}/search/${endpoint}` : 'unknown',
                collection: validCollection,
                attempts: attempt + 1,
                latency,
                timestamp: new Date().toISOString(),
              }
            },
            { status: 504 }
          );
        }

        // If we get here, it's not an axios error or we've exhausted retries
        break;
      }
    }
    
    // If we exhausted all retries, return the last error
    if (lastError) {
      const latency = Date.now() - startTime;
      const errorMessage = lastError instanceof Error ? lastError.message : 'Unknown error';
      
      return NextResponse.json(
        { 
          error: 'typesense_error', 
          detail: { 
            message: errorMessage,
            error: lastError instanceof Error ? lastError.name : 'Unknown',
            stack: lastError instanceof Error ? lastError.stack : undefined,
            url: gatewayUrl ? `${gatewayUrl}/search/${validCollection}` : 'unknown',
            collection: validCollection,
            attempts: maxRetries + 1,
            latency,
            timestamp: new Date().toISOString(),
          }
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('❌ Error in Typesense Gateway proxy:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const gatewayUrl = process.env.TYPESENSE_GATEWAY_URL;
    const validCollection = 'labgrown'; // Default fallback
    
    return NextResponse.json(
      { 
        error: 'typesense_error', 
        detail: { 
          message: errorMessage,
          error: error instanceof Error ? error.name : 'Unknown',
          stack: error instanceof Error ? error.stack : undefined,
          url: gatewayUrl ? `${gatewayUrl}/search/${validCollection}` : 'unknown',
          collection: validCollection,
          timestamp: new Date().toISOString(),
        }
      },
      { status: 502 }
    );
  }
}
