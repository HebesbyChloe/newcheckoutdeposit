# Backend Integration Guide

Complete guide for backend developers integrating with this Shopify Storefront API implementation and planning future backend API and Admin API integration.

## Table of Contents

1. [Current Architecture](#current-architecture)
2. [API Route Structure](#api-route-structure)
3. [Service Layer Organization](#service-layer-organization)
4. [GraphQL Query/Mutation Patterns](#graphql-querymutation-patterns)
5. [Authentication & Authorization](#authentication--authorization)
6. [Environment Variables](#environment-variables)
7. [Future Backend API Integration](#future-backend-api-integration)
8. [Admin API Integration Planning](#admin-api-integration-planning)
9. [Data Flow Diagrams](#data-flow-diagrams)
10. [Error Handling Strategy](#error-handling-strategy)

---

## Current Architecture

### System Overview

```
┌─────────────────┐
│   Frontend      │
│  (Next.js App)  │
└────────┬────────┘
         │
         │ HTTP Requests
         ▼
┌─────────────────┐
│  Next.js API    │
│  Routes (/api)  │
└────────┬────────┘
         │
         │ Service Layer
         ▼
┌─────────────────┐
│  lib/shopify/   │
│   Services      │
└────────┬────────┘
         │
         │ GraphQL
         ▼
┌─────────────────┐
│  Shopify        │
│  Storefront API │
└─────────────────┘
```

### Directory Structure

```
lib/shopify/
├── client.ts              # GraphQL client configuration
├── queries/                # GraphQL queries organized by domain
│   ├── product.ts         # Product queries
│   ├── collection.ts       # Collection queries
│   ├── cart.ts            # Cart queries/mutations
│   ├── customer.ts        # Customer queries/mutations
│   ├── shop.ts            # Shop/menu queries
│   ├── recommendations.ts # Product recommendations
│   ├── blog.ts            # Blog/article queries
│   └── index.ts           # Re-exports
├── services/              # Service layer
│   ├── product.ts         # Product service
│   ├── collection.ts      # Collection service
│   ├── cart.ts            # Cart service
│   ├── customer.ts        # Customer service (main operations)
│   ├── customer-auth.ts   # Customer authentication service
│   ├── customer-address.ts # Address management service
│   ├── customer-unified.ts # Unified customer service (backward compat)
│   ├── shop.ts            # Shop service
│   ├── recommendations.ts # Recommendations service
│   └── index.ts           # Re-exports
├── types.ts               # Shopify-specific types
└── index.ts               # Main entry point

app/api/                    # Next.js API routes
├── products/              # Product endpoints
├── cart/                  # Cart endpoints
├── auth/                  # Authentication endpoints
├── account/               # Account management endpoints
├── collections/           # Collection endpoints
├── search/                # Search endpoint
├── shop/                  # Shop information
└── recommendations/       # Product recommendations

services/shopify/          # Backward compatibility wrappers
└── *.service.ts          # Re-exports from lib/shopify/services/
```

---

## API Route Structure

### Route Pattern

All API routes follow Next.js App Router conventions:

```
app/api/{domain}/{action}/route.ts
```

### Current API Routes

#### Products
- `GET /api/products` - Get all products
- `GET /api/products/[handle]` - Get single product

#### Cart
- `GET /api/cart?id={cartId}` - Get cart
- `POST /api/cart` - Create cart
- `POST /api/cart/items` - Add items
- `PUT /api/cart/items` - Update items
- `DELETE /api/cart/items` - Remove items
- `POST /api/cart/discount` - Apply discount
- `DELETE /api/cart/discount` - Remove discount
- `PUT /api/cart/note` - Update cart note
- `PUT /api/cart/buyer-identity` - Update buyer identity

#### Authentication
- `POST /api/auth/register` - Register customer
- `POST /api/auth/login` - Login customer
- `POST /api/auth/logout` - Logout customer
- `GET /api/auth/me` - Get current customer
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

#### Account Management
- `POST /api/account/addresses` - Create address
- `PUT /api/account/addresses` - Update address
- `DELETE /api/account/addresses` - Delete address

#### Collections
- `GET /api/collections` - Get all collections
- `GET /api/collections/[handle]/products` - Get products by collection

#### Search
- `GET /api/search?q={query}&first={limit}` - Search products

#### Shop
- `GET /api/shop` - Get shop information
- `GET /api/menu/[handle]` - Get menu by handle

#### Recommendations
- `GET /api/recommendations/[productId]` - Get product recommendations

### Route Implementation Pattern

```typescript
// app/api/{domain}/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serviceName } from '@/services/shopify/{service}.service';

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const param = searchParams.get('param');

    // Call service
    const result = await serviceName.method(param);

    // Return response
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Error message' },
      { status: 500 }
    );
  }
}
```

---

## Service Layer Organization

### Service Pattern

All services follow this pattern:

```typescript
// lib/shopify/services/{domain}.ts
import { shopifyClient } from '../client';
import { queryName } from '../queries/{domain}';
import { Type } from '../types';

export class ServiceName {
  async method(param: string): Promise<Type> {
    try {
      const data = await shopifyClient.request<{
        queryName: {
          field: Type;
        };
      }>(queryName, {
        param,
      });

      // Transform response if needed
      return this.transformResponse(data.queryName.field);
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  private transformResponse(raw: any): Type {
    // Transform GraphQL response to internal type
    return {
      // Mapped fields
    };
  }
}

export const serviceName = new ServiceName();
```

### Service Responsibilities

1. **Product Service** (`lib/shopify/services/product.ts`)
   - Fetch products
   - Fetch single product
   - Search products
   - Handles metafield fallbacks

2. **Cart Service** (`lib/shopify/services/cart.ts`)
   - Create cart
   - Get cart
   - Add/update/remove items
   - Apply/remove discounts
   - Update cart note
   - Update buyer identity

3. **Customer Service** (Split into 3 services)
   - **customer.ts** - Main operations (get, update)
   - **customer-auth.ts** - Authentication (create, login, logout, password reset)
   - **customer-address.ts** - Address management (create, update, delete)
   - **customer-unified.ts** - Unified interface for backward compatibility

4. **Collection Service** (`lib/shopify/services/collection.ts`)
   - Get collections
   - Get products by collection
   - Filter collections

5. **Shop Service** (`lib/shopify/services/shop.ts`)
   - Get shop information
   - Get menus

6. **Recommendations Service** (`lib/shopify/services/recommendations.ts`)
   - Get product recommendations

---

## GraphQL Query/Mutation Patterns

### Query Structure

All queries are defined in `lib/shopify/queries/{domain}.ts`:

```typescript
export const queryName = `
  query queryName($param: Type!) {
    shopifyField(param: $param) {
      field1
      field2
      nestedField {
        nestedField1
      }
    }
  }
`;
```

### Mutation Structure

```typescript
export const mutationName = `
  mutation mutationName($input: InputType!) {
    shopifyMutation(input: $input) {
      result {
        field1
        field2
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;
```

### Metafields Pattern

Metafields use the `identifiers` parameter (required for API version 2024-01):

```typescript
metafields(identifiers: [
  { namespace: "custom", key: "shape" },
  { namespace: "custom", key: "cut_grade" },
  // ... more metafields
]) {
  key
  namespace
  value
  type
}
```

### Error Handling in Queries

```typescript
try {
  const data = await shopifyClient.request<ResponseType>(query, variables);
  
  // Check for userErrors
  if (data.mutation.userErrors.length > 0) {
    throw new Error(data.mutation.userErrors[0].message);
  }
  
  return data.mutation.result;
} catch (error) {
  // Handle GraphQL errors
  if (error?.response?.errors) {
    // Handle throttling, network errors, etc.
  }
  throw error;
}
```

---

## Authentication & Authorization

### Current Implementation

**Customer Authentication:**
- Uses **Classic customer accounts** (email + password)
- Access tokens stored in `httpOnly` cookies
- Token expiry: 30 days

**Cookie Configuration:**
```typescript
cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 30, // 30 days
  path: '/',
});
```

### Authentication Flow

```
1. User submits login form
   ↓
2. POST /api/auth/login
   ↓
3. customerAuthService.createAccessToken()
   ↓
4. customerService.getCustomer(accessToken)
   ↓
5. Set httpOnly cookie
   ↓
6. Return customer data
```

### Getting Current Customer

```typescript
// In API route
import { cookies } from 'next/headers';

const cookieStore = await cookies();
const accessToken = cookieStore.get('shopify_customer_access_token')?.value;

if (!accessToken) {
  return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
}

const customer = await customerService.getCustomer(accessToken);
```

### Future: Backend API Authentication

When integrating a backend API, consider:

1. **JWT Tokens** - Issue your own JWT tokens
2. **Session Management** - Server-side sessions
3. **OAuth Integration** - For third-party auth
4. **Role-Based Access Control** - Admin, customer, guest roles

---

## Environment Variables

### Required Variables

```env
# Shopify Storefront API
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_storefront_token
```

### Future Backend API Variables

```env
# Backend API (when integrated)
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
API_SECRET_KEY=your_secret_key

# Admin API (when integrated)
SHOPIFY_ADMIN_API_KEY=your_admin_key
SHOPIFY_ADMIN_API_SECRET=your_admin_secret
SHOPIFY_ADMIN_API_VERSION=2024-01
```

### Environment Variable Access

```typescript
// Client-side (must start with NEXT_PUBLIC_)
const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;

// Server-side (any variable)
const secret = process.env.API_SECRET_KEY;
```

---

## Future Backend API Integration

### Integration Points

When adding a backend API, consider these integration points:

#### 1. **API Client Abstraction**

Create a unified API client that can route to either Shopify or your backend:

```typescript
// lib/api/client.ts
class UnifiedApiClient {
  async getProducts() {
    // Check if backend API is available
    if (process.env.NEXT_PUBLIC_API_URL) {
      return this.backendClient.getProducts();
    }
    // Fallback to Shopify
    return this.shopifyClient.getProducts();
  }
}
```

#### 2. **Data Synchronization**

Plan for syncing data between Shopify and your backend:

```typescript
// lib/sync/shopify-to-backend.ts
export async function syncProductToBackend(product: Product) {
  // Sync product data to your backend
  await backendApi.post('/products', {
    shopifyId: product.id,
    title: product.title,
    // ... other fields
  });
}
```

#### 3. **Hybrid Approach**

Use Shopify for:
- Product catalog
- Cart/checkout
- Customer accounts (initially)

Use Backend API for:
- Custom business logic
- Analytics
- Inventory management (if needed)
- Custom orders processing
- Admin operations

### Backend API Route Structure

When adding backend API routes:

```
app/api/
├── backend/              # Backend API routes
│   ├── products/        # Backend product endpoints
│   ├── orders/          # Custom order processing
│   ├── analytics/       # Analytics endpoints
│   └── admin/           # Admin operations
└── shopify/             # Keep Shopify routes (or migrate gradually)
```

### Migration Strategy

1. **Phase 1:** Keep Shopify API, add backend API alongside
2. **Phase 2:** Route specific operations to backend API
3. **Phase 3:** Gradually migrate more operations
4. **Phase 4:** Use backend API as primary, Shopify as fallback

---

## Admin API Integration Planning

### Use Cases for Admin API

1. **Product Management**
   - Create/update/delete products
   - Bulk operations
   - Inventory management

2. **Order Management**
   - View all orders
   - Update order status
   - Fulfillment tracking

3. **Customer Management**
   - View all customers
   - Customer segmentation
   - Marketing lists

4. **Analytics & Reports**
   - Sales reports
   - Product performance
   - Customer analytics

### Admin API Setup

```typescript
// lib/shopify/admin/client.ts
import { GraphQLClient } from 'graphql-request';

const adminEndpoint = `https://${domain}/admin/api/${version}/graphql.json`;

export const adminClient = new GraphQLClient(adminEndpoint, {
  headers: {
    'X-Shopify-Access-Token': adminAccessToken,
    'Content-Type': 'application/json',
  },
});
```

### Admin API Routes

```
app/api/admin/
├── products/
│   ├── route.ts          # List/create products
│   └── [id]/
│       └── route.ts      # Update/delete product
├── orders/
│   ├── route.ts          # List orders
│   └── [id]/
│       └── route.ts      # Order details/update
├── customers/
│   └── route.ts          # List customers
└── analytics/
    └── route.ts          # Analytics endpoints
```

### Admin API Authentication

Admin API requires:
- **Admin API access token** (different from Storefront API)
- **OAuth flow** for app installation
- **Scoped permissions** for specific operations

### Security Considerations

1. **Never expose Admin API tokens** to frontend
2. **Use server-side only** for Admin API calls
3. **Implement role-based access** for admin routes
4. **Rate limiting** for Admin API calls
5. **Audit logging** for admin operations

---

## Data Flow Diagrams

### Product Fetch Flow

```
Frontend Component
    │
    │ useProducts() hook
    ▼
Next.js API Route: GET /api/products
    │
    │ productsService.getProducts()
    ▼
Service Layer: lib/shopify/services/product.ts
    │
    │ shopifyClient.request(getProductsQuery)
    ▼
Shopify Storefront API
    │
    │ GraphQL Response
    ▼
Service transforms response
    │
    │ Product[]
    ▼
API Route returns JSON
    │
    │ Product[]
    ▼
Hook updates state
    │
    │ products state
    ▼
Component re-renders
```

### Cart Add Item Flow

```
User clicks "Add to Cart"
    │
    │ useCart().addToCart(variantId)
    ▼
POST /api/cart
    │
    │ { variantId, quantity }
    ▼
cartService.createCart()
    │
    │ cartCreateMutation
    ▼
Shopify Storefront API
    │
    │ { cartId, checkoutUrl }
    ▼
Save cartId to localStorage
    │
    │
    ▼
Return cart data
    │
    │
    ▼
Hook updates cart state
    │
    │
    ▼
UI updates (cart icon, cart page)
```

### Authentication Flow

```
User submits login form
    │
    │ useAuth().login(email, password)
    ▼
POST /api/auth/login
    │
    │ customerAuthService.createAccessToken()
    ▼
Shopify Storefront API
    │
    │ { accessToken, expiresAt }
    ▼
customerService.getCustomer(accessToken)
    │
    │
    ▼
Set httpOnly cookie
    │
    │
    ▼
Return customer data
    │
    │
    ▼
Hook updates auth state
    │
    │
    ▼
User is logged in
```

---

## Error Handling Strategy

### Error Types

1. **GraphQL Errors** - From Shopify API
   ```typescript
   {
     response: {
       errors: Array<{
         message: string;
         extensions: { code: string };
       }>;
     };
   }
   ```

2. **User Errors** - Validation errors from mutations
   ```typescript
   {
     mutation: {
       userErrors: Array<{
         field: string[];
         message: string;
         code: string;
       }>;
     };
   }
   ```

3. **Network Errors** - Connection issues
4. **Timeout Errors** - Request timeout

### Error Handling Pattern

```typescript
try {
  const data = await shopifyClient.request<ResponseType>(query, variables);
  
  // Check for userErrors first
  if (data.mutation.userErrors.length > 0) {
    const errors = data.mutation.userErrors.map(e => e.message);
    throw new Error(errors.join(', '));
  }
  
  return data.mutation.result;
} catch (error: any) {
  // Handle GraphQL response errors
  if (error?.response?.errors) {
    const graphqlErrors = error.response.errors;
    
    // Handle throttling
    if (graphqlErrors.some(e => e.extensions?.code === 'THROTTLED')) {
      throw new Error('Too many requests. Please wait a moment.');
    }
    
    // Handle other GraphQL errors
    const messages = graphqlErrors.map(e => e.message);
    throw new Error(messages.join(', '));
  }
  
  // Handle network/timeout errors
  if (error instanceof Error) {
    throw error;
  }
  
  throw new Error('Unknown error occurred');
}
```

### Error Logging

```typescript
// Sanitize sensitive data before logging
const safeError = errorMessage.replace(/password[^,}]*/gi, '[REDACTED]');
console.error('Error:', safeError);
```

### Fallback Strategies

1. **Metafields Fallback** - Try with metafields, fallback without
2. **Retry Logic** - For network errors
3. **Graceful Degradation** - Show partial data if possible

---

## Type Definitions

### Core Types Location

```typescript
// lib/shopify/types.ts
export interface Shop { ... }
export interface Menu { ... }
export interface Customer { ... }
export interface CustomerAddress { ... }

// types/api.types.ts
export interface Cart { ... }
export interface CartLine { ... }

// types/shopify.ts
export interface Product { ... }
export interface Metafield { ... }
```

### Type Safety

All services use TypeScript with strict typing:

```typescript
// Service method signature
async getProduct(handle: string): Promise<Product | null>

// API route response
NextResponse.json<Product>(product)
```

---

## Testing Strategy

### Unit Tests

Test services in isolation:

```typescript
// __tests__/services/product.test.ts
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
// __tests__/api/products.test.ts
describe('GET /api/products', () => {
  it('should return products', async () => {
    const response = await fetch('/api/products');
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });
});
```

### E2E Tests

Test full user flows with Playwright/Cypress.

---

## Performance Optimization

### Caching Strategy

1. **Next.js Caching** - Use `revalidate` for static data
2. **Service-Level Caching** - Cache frequently accessed data
3. **Client-Side Caching** - React Query or SWR for hooks

### Query Optimization

1. **Request Only Needed Fields** - Minimize GraphQL query size
2. **Batch Requests** - Combine multiple queries when possible
3. **Pagination** - Use cursor-based pagination

---

## Monitoring & Logging

### Logging Strategy

```typescript
// Structured logging
console.error('Error fetching product:', {
  handle,
  error: error.message,
  timestamp: new Date().toISOString(),
});
```

### Metrics to Track

1. API response times
2. Error rates
3. GraphQL query performance
4. Cart abandonment
5. Authentication success/failure rates

---

## Migration Checklist

When integrating backend API:

- [ ] Set up backend API infrastructure
- [ ] Create API client abstraction layer
- [ ] Implement authentication for backend API
- [ ] Create data sync mechanism (Shopify ↔ Backend)
- [ ] Update API routes to support both sources
- [ ] Add feature flags for gradual migration
- [ ] Update frontend hooks to work with both APIs
- [ ] Implement fallback mechanisms
- [ ] Add monitoring and logging
- [ ] Update documentation

---

## Additional Resources

- [Shopify Storefront API Docs](https://shopify.dev/docs/api/storefront)
- [Shopify Admin API Docs](https://shopify.dev/docs/api/admin-graphql)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)

---

## Support

For backend integration questions:
1. Review service layer code in `lib/shopify/services/`
2. Check API route implementations in `app/api/`
3. Review GraphQL queries in `lib/shopify/queries/`
4. Refer to the API guides in `docs/` for available endpoints

