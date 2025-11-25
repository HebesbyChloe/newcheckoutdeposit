# API Architecture

System architecture overview, API layer structure, and design patterns for the Shopify Storefront API implementation.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [API Layer Structure](#api-layer-structure)
3. [Service Layer Patterns](#service-layer-patterns)
4. [Type System](#type-system)
5. [Error Handling Strategy](#error-handling-strategy)
6. [Data Transformation](#data-transformation)
7. [Future Expansion Plans](#future-expansion-plans)

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Pages      │  │  Components  │  │    Hooks     │ │
│  │  (Next.js)   │  │   (React)    │  │  (React)    │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
└─────────┼──────────────────┼──────────────────┼─────────┘
          │                  │                  │
          │ HTTP Requests    │ Hook Calls       │
          │                  │                  │
┌─────────┼──────────────────┼──────────────────┼─────────┐
│         ▼                  ▼                  ▼         │
│  ┌──────────────────────────────────────────────────┐   │
│  │         Next.js API Routes Layer                 │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │   │
│  │  │ Products │  │   Cart   │  │   Auth   │  ... │   │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘      │   │
│  └───────┼──────────────┼─────────────┼────────────┘   │
│          │              │             │                 │
│          │ Service Calls│             │                 │
│          ▼              ▼             ▼                 │
│  ┌──────────────────────────────────────────────────┐   │
│  │         Service Layer (lib/shopify/services/)    │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │   │
│  │  │ Product  │  │   Cart    │  │ Customer │  ... │   │
│  │  │ Service  │  │  Service  │  │ Service  │      │   │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘      │   │
│  └───────┼──────────────┼─────────────┼────────────┘   │
│          │              │             │                 │
│          │ GraphQL Queries/Mutations                    │
│          ▼              ▼             ▼                 │
│  ┌──────────────────────────────────────────────────┐   │
│  │    GraphQL Client (lib/shopify/client.ts)         │   │
│  │         Uses: graphql-request                      │   │
│  └───────────────────┬──────────────────────────────┘   │
└───────────────────────┼──────────────────────────────────┘
                        │
                        │ HTTPS
                        │ GraphQL
                        ▼
        ┌───────────────────────────────┐
        │   Shopify Storefront API      │
        │   (api/2024-01/graphql.json)  │
        └───────────────────────────────┘
```

### Component Interaction Flow

```
User Action
    │
    ▼
React Component
    │
    │ useHook()
    ▼
React Hook (useCart, useProducts, etc.)
    │
    │ fetch('/api/...')
    ▼
Next.js API Route
    │
    │ service.method()
    ▼
Service Layer
    │
    │ shopifyClient.request(query)
    ▼
GraphQL Client
    │
    │ HTTPS POST
    ▼
Shopify Storefront API
    │
    │ GraphQL Response
    ▼
Service transforms response
    │
    │ Typed data
    ▼
API Route returns JSON
    │
    │ JSON response
    ▼
Hook updates state
    │
    │ React state
    ▼
Component re-renders
```

---

## API Layer Structure

### Directory Organization

```
app/api/                          # Next.js API routes
├── products/
│   ├── route.ts                  # GET /api/products
│   └── [handle]/
│       └── route.ts              # GET /api/products/[handle]
├── cart/
│   ├── route.ts                  # GET, POST /api/cart
│   ├── items/
│   │   └── route.ts              # POST, PUT, DELETE /api/cart/items
│   ├── discount/
│   │   └── route.ts              # POST, DELETE /api/cart/discount
│   ├── note/
│   │   └── route.ts              # PUT /api/cart/note
│   └── buyer-identity/
│       └── route.ts              # PUT /api/cart/buyer-identity
├── auth/
│   ├── register/
│   │   └── route.ts              # POST /api/auth/register
│   ├── login/
│   │   └── route.ts              # POST /api/auth/login
│   ├── logout/
│   │   └── route.ts              # POST /api/auth/logout
│   ├── me/
│   │   └── route.ts              # GET /api/auth/me
│   ├── profile/
│   │   └── route.ts              # PUT /api/auth/profile
│   ├── forgot-password/
│   │   └── route.ts              # POST /api/auth/forgot-password
│   └── reset-password/
│       └── route.ts              # POST /api/auth/reset-password
├── account/
│   └── addresses/
│       └── route.ts              # POST, PUT, DELETE /api/account/addresses
├── collections/
│   ├── route.ts                  # GET /api/collections
│   └── [handle]/
│       └── products/
│           └── route.ts          # GET /api/collections/[handle]/products
├── search/
│   └── route.ts                  # GET /api/search
├── shop/
│   └── route.ts                  # GET /api/shop
├── menu/
│   └── [handle]/
│       └── route.ts              # GET /api/menu/[handle]
└── recommendations/
    └── [productId]/
        └── route.ts              # GET /api/recommendations/[productId]
```

### API Route Pattern

All routes follow this structure:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { serviceName } from '@/services/shopify/{service}.service';

export async function GET(request: NextRequest) {
  try {
    // 1. Extract parameters
    const searchParams = request.nextUrl.searchParams;
    const param = searchParams.get('param');

    // 2. Validate input
    if (!param) {
      return NextResponse.json(
        { error: 'Parameter required' },
        { status: 400 }
      );
    }

    // 3. Call service
    const result = await serviceName.method(param);

    // 4. Handle service errors
    if (!result) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    // 5. Return success response
    return NextResponse.json({ data: result });
  } catch (error) {
    // 6. Handle errors
    console.error('Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

---

## Service Layer Patterns

### Service Organization

```
lib/shopify/services/
├── product.ts              # Product operations
├── collection.ts           # Collection operations
├── cart.ts                 # Cart operations
├── customer.ts             # Customer main operations
├── customer-auth.ts        # Authentication operations
├── customer-address.ts     # Address operations
├── customer-unified.ts     # Unified customer interface
├── shop.ts                 # Shop information
├── recommendations.ts      # Product recommendations
└── index.ts                # Re-exports
```

### Service Pattern

```typescript
// lib/shopify/services/{domain}.ts
import { shopifyClient } from '../client';
import { queryName, mutationName } from '../queries/{domain}';
import { Type } from '../types';

export class ServiceName {
  /**
   * Method description
   */
  async method(param: string): Promise<Type | null> {
    try {
      // 1. Make GraphQL request
      const data = await shopifyClient.request<{
        queryName: {
          field: Type;
          userErrors?: Array<{
            field: string[];
            message: string;
            code: string;
          }>;
        };
      }>(queryName, {
        param,
      });

      // 2. Check for userErrors
      if (data.queryName.userErrors?.length > 0) {
        const errors = data.queryName.userErrors.map(e => e.message);
        throw new Error(errors.join(', '));
      }

      // 3. Transform response
      return this.transformResponse(data.queryName.field);
    } catch (error: any) {
      // 4. Handle GraphQL errors
      if (error?.response?.errors) {
        const graphqlErrors = error.response.errors;
        // Handle specific error codes
        if (graphqlErrors.some(e => e.extensions?.code === 'THROTTLED')) {
          throw new Error('Too many requests. Please wait.');
        }
        throw new Error(graphqlErrors.map(e => e.message).join(', '));
      }

      // 5. Handle other errors
      console.error('Error in service:', error);
      throw error;
    }
  }

  /**
   * Transform GraphQL response to internal type
   */
  private transformResponse(raw: any): Type {
    return {
      // Map GraphQL structure to internal type
      field1: raw.field1,
      field2: raw.nestedField?.field2,
      // Handle edges/node structure
      items: raw.items?.edges?.map((edge: any) => edge.node) || [],
    };
  }
}

// Export singleton instance
export const serviceName = new ServiceName();
```

### Service Responsibilities

| Service | Responsibilities |
|---------|------------------|
| `product.ts` | Fetch products, search, get by handle, metafield handling |
| `collection.ts` | Get collections, get products by collection, filter collections |
| `cart.ts` | Create cart, get cart, add/update/remove items, discounts, notes |
| `customer.ts` | Get customer, update customer profile |
| `customer-auth.ts` | Register, login, logout, password reset |
| `customer-address.ts` | Create, update, delete addresses |
| `shop.ts` | Get shop information, get menus |
| `recommendations.ts` | Get product recommendations |

---

## Type System

### Type Organization

```
types/
├── api.types.ts           # API request/response types
├── hook.types.ts          # Hook return types
├── product.types.ts       # Product-related types
├── shopify.ts             # Shopify-specific types & helpers
├── filter.types.ts        # Filter types
└── component.types.ts     # Component prop types

lib/shopify/
└── types.ts               # Shopify service types (Shop, Menu, Customer, etc.)
```

### Type Flow

```
GraphQL Response (Shopify)
    │
    │ Raw GraphQL types
    ▼
Service Layer Transformation
    │
    │ Internal types
    ▼
API Route Response
    │
    │ JSON (typed)
    ▼
Frontend Hook
    │
    │ Hook return types
    ▼
React Component
    │
    │ Component prop types
    ▼
UI Rendering
```

### Key Types

**Product:**
```typescript
interface Product {
  id: string;
  title: string;
  handle: string;
  description: string;
  priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
  images: { edges: Array<{ node: { url: string; altText: string } }> };
  variants: { edges: Array<{ node: Variant }> };
  metafields: Array<{ namespace: string; key: string; value: string; type: string }>;
}
```

**Cart:**
```typescript
interface Cart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: {
    totalAmount: { amount: string; currencyCode: string };
    subtotalAmount: { amount: string; currencyCode: string };
  };
  lines: CartLine[];
  discountCodes: Array<{ code: string; applicable: boolean }>;
}
```

**Customer:**
```typescript
interface Customer {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  defaultAddress: CustomerAddress | null;
  addresses: CustomerAddress[];
  orders: CustomerOrder[];
}
```

---

## Error Handling Strategy

### Error Hierarchy

```
Error
├── GraphQL Errors (response.errors)
│   ├── THROTTLED
│   ├── UNAUTHENTICATED
│   └── Other GraphQL errors
├── User Errors (userErrors)
│   ├── Validation errors
│   └── Business logic errors
├── Network Errors
│   ├── Timeout
│   └── Connection failed
└── Service Errors
    └── Transformation errors
```

### Error Handling Flow

```
Service Method
    │
    │ try { ... }
    ▼
GraphQL Request
    │
    ├─ Success → Transform → Return
    │
    ├─ GraphQL Error → Check error code
    │   ├─ THROTTLED → Retry or throw throttled error
    │   └─ Other → Throw with message
    │
    └─ Network Error → Retry or throw network error
```

### Error Response Format

```typescript
// API Route Error Response
{
  error: string;           // Main error message
  message?: string;        // Additional details
  details?: string;        // Technical details (dev only)
}

// HTTP Status Codes
200 - Success
400 - Bad Request (validation)
401 - Unauthorized
403 - Forbidden (account disabled)
404 - Not Found
500 - Server Error
```

---

## Data Transformation

### GraphQL to Internal Types

Shopify GraphQL uses `edges`/`node` structure:

```typescript
// GraphQL Response
{
  products: {
    edges: [
      {
        node: {
          id: "...",
          title: "..."
        }
      }
    ]
  }
}

// Transformed to
[
  {
    id: "...",
    title: "..."
  }
]
```

### Metafield Parsing

Metafields may be stored as JSON strings:

```typescript
// Raw value: '["Round"]'
// Parsed value: 'Round'

function parseMetafieldValue(value: string): string {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return String(parsed[0]);
    }
    return String(parsed);
  } catch {
    return value;
  }
}
```

### Cart Response Transformation

```typescript
// GraphQL structure
{
  cart: {
    lines: {
      edges: [
        {
          node: {
            id: "...",
            quantity: 1,
            merchandise: { ... }
          }
        }
      ]
    }
  }
}

// Transformed to
{
  lines: [
    {
      id: "...",
      quantity: 1,
      merchandise: { ... }
    }
  ]
}
```

---

## Future Expansion Plans

### Phase 1: Backend API Integration

**Goals:**
- Add backend API alongside Shopify
- Implement API client abstraction
- Support both data sources

**Changes:**
```
lib/
├── shopify/          # Keep existing
└── backend/          # New backend API client
    ├── client.ts
    ├── services/
    └── types.ts

app/api/
├── shopify/          # Shopify routes (migrate existing)
└── backend/          # Backend API routes
```

### Phase 2: Admin API Integration

**Goals:**
- Add Admin API for management operations
- Implement OAuth flow
- Add admin routes

**Changes:**
```
lib/shopify/
└── admin/
    ├── client.ts
    ├── queries/
    └── services/

app/api/
└── admin/
    ├── products/
    ├── orders/
    └── customers/
```

### Phase 3: Unified API Layer

**Goals:**
- Abstract API sources
- Single interface for frontend
- Smart routing (Shopify vs Backend)

**Changes:**
```
lib/api/
├── client.ts         # Unified client
├── router.ts         # Route to correct source
├── shopify/
└── backend/
```

### Phase 4: Advanced Features

**Planned Features:**
- Real-time updates (WebSockets)
- Advanced caching (Redis)
- Analytics integration
- A/B testing support
- Multi-currency support
- Localization

---

## Performance Considerations

### Caching Strategy

1. **Next.js Static Generation**
   - Use `revalidate` for product pages
   - ISR for collections

2. **Service-Level Caching**
   - Cache shop information
   - Cache collections list

3. **Client-Side Caching**
   - React Query for hooks
   - localStorage for cart

### Query Optimization

1. **Request Only Needed Fields**
   ```graphql
   # ✅ Good - Only request needed fields
   query {
     product(handle: "...") {
       id
       title
       priceRange { minVariantPrice { amount } }
     }
   }
   ```

2. **Use Pagination**
   ```typescript
   // Use cursor-based pagination
   products(first: 20, after: cursor)
   ```

3. **Batch Requests**
   ```typescript
   // Combine multiple queries when possible
   const [products, collections] = await Promise.all([
     productsService.getProducts(),
     collectionsService.getCollections()
   ]);
   ```

---

## Security Considerations

### Current Implementation

1. **Access Tokens**
   - Stored in `httpOnly` cookies
   - Never exposed to client-side JavaScript

2. **Password Handling**
   - Never logged
   - Sanitized in error messages

3. **API Keys**
   - Server-side only
   - Environment variables

### Future Enhancements

1. **Rate Limiting**
   - Implement per-IP rate limiting
   - Per-user rate limiting for authenticated users

2. **Input Validation**
   - Validate all inputs
   - Sanitize user data

3. **CORS Configuration**
   - Configure allowed origins
   - Restrict API access

---

## Monitoring & Observability

### Logging Strategy

```typescript
// Structured logging
console.error('Error fetching product:', {
  handle,
  error: error.message,
  timestamp: new Date().toISOString(),
  userId: customer?.id,
});
```

### Metrics to Track

1. **Performance**
   - API response times
   - GraphQL query duration
   - Cache hit rates

2. **Errors**
   - Error rates by endpoint
   - GraphQL error types
   - User error frequency

3. **Business Metrics**
   - Cart abandonment
   - Product views
   - Search queries
   - Authentication success/failure

---

## Documentation Standards

### Code Documentation

```typescript
/**
 * Fetch product by handle
 * 
 * @param handle - Product handle (slug)
 * @returns Product or null if not found
 * @throws Error if request fails
 */
async getProductByHandle(handle: string): Promise<Product | null>
```

### API Documentation

- Endpoint URL
- HTTP method
- Request parameters
- Response format
- Error responses
- Example requests/responses

---

## Testing Strategy

### Unit Tests

Test services in isolation:

```typescript
describe('ProductsService', () => {
  it('should fetch products', async () => {
    const products = await productsService.getProducts(10);
    expect(products).toBeInstanceOf(Array);
  });
});
```

### Integration Tests

Test API routes:

```typescript
describe('GET /api/products', () => {
  it('should return products array', async () => {
    const response = await fetch('/api/products');
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });
});
```

### E2E Tests

Test user flows with Playwright.

---

## Migration Guide

### Adding New API Endpoint

1. **Create GraphQL Query**
   ```typescript
   // lib/shopify/queries/{domain}.ts
   export const newQuery = `query ...`;
   ```

2. **Add Service Method**
   ```typescript
   // lib/shopify/services/{domain}.ts
   async newMethod(): Promise<Type> { ... }
   ```

3. **Create API Route**
   ```typescript
   // app/api/{domain}/route.ts
   export async function GET() { ... }
   ```

4. **Create Hook (if needed)**
   ```typescript
   // hooks/useNewFeature.ts
   export function useNewFeature() { ... }
   ```

5. **Update Documentation**
   - Add to FRONTEND_API_GUIDE.md
   - Add to BACKEND_INTEGRATION_GUIDE.md

---

## Additional Resources

- [Shopify Storefront API](https://shopify.dev/docs/api/storefront)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## Changelog

### Current Version
- API Version: Shopify Storefront API 2024-01
- Architecture: Next.js App Router with API routes
- Authentication: Classic customer accounts
- Cart: Server-side cart with localStorage persistence

### Planned Updates
- Backend API integration
- Admin API integration
- Advanced caching
- Real-time updates

