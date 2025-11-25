// API-related types

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  details?: string;
}

export interface ApiError {
  error: string;
  message: string;
  details?: string;
  status?: number;
}

export interface ProductsApiResponse {
  products: Array<any>;
  count?: number;
  hasMore?: boolean;
}

export interface ProductApiResponse {
  product: any | null;
  success?: boolean;
}

export interface CartApiResponse {
  checkoutUrl?: string;
  cartId?: string;
  cart?: Cart;
  error?: string;
}

export interface CartCreateRequest {
  variantId: string;
  quantity?: number;
  attributes?: Array<{ key: string; value: string }>;
}

export interface CartLine {
  id: string;
  quantity: number;
  attributes?: Array<{
    key: string;
    value: string;
  }>;
  // Shopify cart structure
  merchandise?: {
    id: string;
    title: string;
    price: {
      amount: string;
      currencyCode: string;
    };
    metafields?: Array<{
      namespace: string;
      key: string;
      value: string;
      type: string;
    }>;
    product: {
      id: string;
      title: string;
      handle: string;
      images: Array<{
        url: string;
        altText: string | null;
      }>;
    };
  };
  cost?: {
    totalAmount: {
      amount: string;
      currencyCode: string;
    };
  };
  // Custom backend cart structure
  title?: string;
  imageUrl?: string;
  productHandle?: string;
  price?: {
    amount: string;
    currencyCode: string;
  };
}

export interface Cart {
  id: string;
  checkoutUrl?: string;
  totalQuantity: number;
  cost?: {
    totalAmount: {
      amount: string;
      currencyCode: string;
    };
    subtotalAmount: {
      amount: string;
      currencyCode: string;
    };
    totalTaxAmount?: {
      amount: string;
      currencyCode: string;
    } | null;
    totalDutyAmount?: {
      amount: string;
      currencyCode: string;
    } | null;
  };
  discountCodes: Array<{
    code: string;
    applicable: boolean;
  }>;
  lines: CartLine[];
}

export interface CartUpdateRequest {
  cartId: string;
  lines: Array<{
    id: string;
    quantity: number;
  }>;
}

export interface CartRemoveRequest {
  cartId: string;
  lineIds: string[];
}

export interface CartDiscountRequest {
  cartId: string;
  discountCodes: string[];
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  retries?: number;
  timeout?: number;
}

// Gateway response envelope format
export interface GatewayResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  } | null;
}

