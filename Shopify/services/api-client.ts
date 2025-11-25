// Unified API client with error handling and type safety using Axios
import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { ApiResponse, ApiError, ApiRequestOptions } from '@/types/api.types';

class ApiClient {
  private axiosInstance: AxiosInstance;
  private baseUrl: string;
  private gatewayBaseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
    // Gateway URL - use environment variable or default to localhost:3010
    // In Next.js, client-side env vars must be prefixed with NEXT_PUBLIC_
    this.gatewayBaseUrl = 
      (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_GATEWAY_URL) ||
      'http://localhost:3010';
    
    // Debug logging for gateway URL initialization
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
      console.log('🔧 [API Client] Initialized with:', {
        baseUrl: this.baseUrl,
        gatewayBaseUrl: this.gatewayBaseUrl,
        envVar: process.env.NEXT_PUBLIC_GATEWAY_URL || 'not set (using default)',
      });
    }
    
    // Create axios instance with default config
    this.axiosInstance = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Make API request with retry logic and error handling
   */
  async request<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      retries = 0,
      timeout = 30000,
    } = options;

    // Route gateway endpoints to the gateway server
    let url: string;
    let targetBaseUrl: string;
    if (endpoint.startsWith('/api/gw/v1/')) {
      // Gateway endpoint - use gateway base URL
      targetBaseUrl = this.gatewayBaseUrl;
      url = `${targetBaseUrl}${endpoint}`;
      
      // Debug logging for gateway requests
      if (process.env.NODE_ENV !== 'production') {
        console.log('🚀 [API Client] Gateway request:', {
          endpoint,
          gatewayBaseUrl: this.gatewayBaseUrl,
          fullUrl: url,
          method,
        });
      }
    } else {
      // Regular endpoint - use default base URL (Next.js server)
      targetBaseUrl = this.baseUrl;
      url = `${targetBaseUrl}${endpoint}`;
    }

    const requestConfig: AxiosRequestConfig = {
      method,
      url,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      data: body,
      timeout,
      // Ensure we use the full URL, not the baseURL
      baseURL: undefined, // Override baseURL to use full URL
    };

    // Debug: Log the actual request that will be made
    if (process.env.NODE_ENV !== 'production' && endpoint.startsWith('/api/gw/v1/')) {
      console.log('🌐 [API Client] Axios request config:', {
        method,
        url,
        baseURL: requestConfig.baseURL,
        fullUrl: url,
        hasBody: !!body,
      });
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // For gateway requests, create a new axios instance with the gateway URL as baseURL
        // This ensures the request goes to the correct server
        let axiosInstance = this.axiosInstance;
        if (endpoint.startsWith('/api/gw/v1/')) {
          // Create a temporary axios instance for gateway requests
          const { default: axios } = await import('axios');
          axiosInstance = axios.create({
            baseURL: this.gatewayBaseUrl,
            timeout: 30000,
            headers: {
              'Content-Type': 'application/json',
            },
          });
          // Use relative URL for gateway requests
          requestConfig.url = endpoint;
        }
        
        const response = await axiosInstance.request<T>(requestConfig);

        // Axios automatically parses JSON, so response.data is already parsed
        return { data: response.data };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Handle Axios errors
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;

          // Timeout error
          if (axiosError.code === 'ECONNABORTED' || axiosError.message.includes('timeout')) {
            return {
              error: 'Request timeout',
              message: 'The request took too long to complete',
            };
          }

          // HTTP error response (4xx, 5xx)
          if (axiosError.response) {
            const responseData = axiosError.response.data as {
              error?: string;
              message?: string;
              details?: string;
            } | null;
            const error: ApiError = {
              error: responseData?.error || 'Request failed',
              message: responseData?.message || axiosError.message || `HTTP ${axiosError.response.status}`,
              details: responseData?.details || axiosError.stack,
              status: axiosError.response.status,
            };

            return { error: error.error, message: error.message, details: error.details };
          }

          // Network error (no response received)
          if (axiosError.request) {
            // Retry on network errors
            if (attempt < retries) {
              await this.delay(1000 * (attempt + 1)); // Exponential backoff
              continue;
            }

            return {
              error: 'Network error',
              message: 'Unable to connect to the server',
              details: axiosError.message,
            };
          }
        }

        // Don't retry on non-network errors
        if (attempt < retries && this.isRetryableError(error)) {
          await this.delay(1000 * (attempt + 1)); // Exponential backoff
          continue;
        }
      }
    }

    return {
      error: 'Request failed',
      message: lastError?.message || 'Unknown error',
      details: lastError?.stack,
    };
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      // Retry on network errors or 5xx server errors
      if (!axiosError.response) return true; // Network error
      if (axiosError.response.status >= 500) return true; // Server error
      
      return false;
    }
    
    return false;
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    body?: any,
    options?: Omit<ApiRequestOptions, 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * Delay helper for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export class for custom instances
export default ApiClient;

