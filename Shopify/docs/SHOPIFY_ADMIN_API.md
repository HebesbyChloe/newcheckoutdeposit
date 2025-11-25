# Shopify Admin API Integration Guide

Complete guide for integrating and using the Shopify Admin API in this project. The Admin API provides server-side access to manage products, orders, customers, and other store resources.

## Table of Contents

1. [Overview](#overview)
2. [Setup & Configuration](#setup--configuration)
3. [Authentication](#authentication)
4. [API Client Setup](#api-client-setup)
5. [Common Operations](#common-operations)
6. [GraphQL Queries](#graphql-queries)
7. [GraphQL Mutations](#graphql-mutations)
8. [Error Handling](#error-handling)
9. [Rate Limiting](#rate-limiting)
10. [Best Practices](#best-practices)
11. [References](#references)

---

## Overview

The Shopify Admin API allows you to:
- **Manage Products**: Create, update, delete products and variants
- **Handle Orders**: View, update, and fulfill orders
- **Manage Customers**: Access customer data and segments
- **Inventory Management**: Track and update inventory levels
- **Analytics**: Access sales reports and analytics
- **Bulk Operations**: Perform bulk updates and imports

**Important**: Admin API is **server-side only**. Never expose Admin API tokens to the frontend.

---

## Setup & Configuration

### 1. Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Shopify Storefront API (Client-side accessible)
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_storefront_access_token

# Shopify Admin API (Server-side only - DO NOT expose to client)
SHOPIFY_ADMIN_API_KEY=your_admin_api_key
SHOPIFY_ADMIN_API_SECRET=your_admin_api_secret
SHOPIFY_ADMIN_ACCESS_TOKEN=your_admin_access_token
SHOPIFY_ADMIN_API_VERSION=2024-01
```

### 2. Obtaining Admin API Credentials

#### Step 1: Create a Custom App

1. Log in to your Shopify Admin panel
2. Navigate to **Settings** → **Apps and sales channels**
3. Click **Develop apps** → **Create an app**
4. Provide a name for your app (e.g., "RITAMIE Admin API")

#### Step 2: Configure API Scopes

1. Open the newly created app
2. Go to the **API credentials** tab
3. Under **Admin API access scopes**, select the permissions required:

**Common Scopes:**
- `read_products` - Read product data
- `write_products` - Create/update/delete products
- `read_orders` - Read order data
- `write_orders` - Update orders
- `read_customers` - Read customer data
- `write_customers` - Update customer data
- `read_inventory` - Read inventory levels
- `write_inventory` - Update inventory
- `read_analytics` - Access analytics data

4. Click **Save**

#### Step 3: Install App and Get Access Token

1. After setting permissions, go to the **API credentials** tab
2. Under **Admin API access token**, click **Install app**
3. Shopify will generate an Admin API access token
4. **Copy this token immediately** - it's only shown once
5. Add it to your `.env.local` file as `SHOPIFY_ADMIN_ACCESS_TOKEN`

#### Step 4: Get API Key and Secret (for OAuth)

1. In the **API credentials** tab
2. Copy the **API key** → `SHOPIFY_ADMIN_API_KEY`
3. Copy the **API secret key** → `SHOPIFY_ADMIN_API_SECRET`

---

## Authentication

### Access Token Authentication

The Admin API uses access tokens for authentication. Include the token in the request headers:

```typescript
headers: {
  'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
  'Content-Type': 'application/json',
}
```

### OAuth Flow (For Public Apps)

For public apps that need to be installed by multiple stores, use OAuth:

1. Redirect to Shopify OAuth URL
2. User authorizes the app
3. Receive authorization code
4. Exchange code for access token
5. Store access token securely

**Note**: For private apps (single store), use the access token directly.

---

## API Client Setup

### GraphQL Client

Create `lib/shopify/admin/client.ts`:

```typescript
import { GraphQLClient } from 'graphql-request';

const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN!;
const adminAccessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!;
const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION || '2024-01';

if (!domain || !adminAccessToken) {
  throw new Error('Missing Shopify Admin API environment variables');
}

const adminEndpoint = `https://${domain}/admin/api/${apiVersion}/graphql.json`;

export const adminClient = new GraphQLClient(adminEndpoint, {
  headers: {
    'X-Shopify-Access-Token': adminAccessToken,
    'Content-Type': 'application/json',
  },
});
```

### REST API Client (Alternative)

For REST API operations:

```typescript
const adminRestEndpoint = `https://${domain}/admin/api/${apiVersion}`;

export async function adminRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${adminRestEndpoint}${endpoint}`;
  
  return fetch(url, {
    ...options,
    headers: {
      'X-Shopify-Access-Token': adminAccessToken,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}
```

---

## Common Operations

### Products

#### Get All Products

```graphql
query getAllProducts($first: Int!) {
  products(first: $first) {
    edges {
      node {
        id
        title
        handle
        description
        status
        variants(first: 10) {
          edges {
            node {
              id
              title
              price
              inventoryQuantity
            }
          }
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

#### Create Product

```graphql
mutation productCreate($input: ProductInput!) {
  productCreate(input: $input) {
    product {
      id
      title
      handle
    }
    userErrors {
      field
      message
    }
  }
}
```

**Variables:**
```typescript
const variables = {
  input: {
    title: "New Product",
    description: "Product description",
    vendor: "RITAMIE",
    productType: "Jewelry",
    variants: [
      {
        price: "99.99",
        inventoryQuantities: [
          {
            availableQuantity: 10,
            locationId: "gid://shopify/Location/123456"
          }
        ]
      }
    ]
  }
};
```

#### Update Product

```graphql
mutation productUpdate($input: ProductInput!) {
  productUpdate(input: $input) {
    product {
      id
      title
    }
    userErrors {
      field
      message
    }
  }
}
```

#### Delete Product

```graphql
mutation productDelete($id: ID!) {
  productDelete(id: $id) {
    deletedProductId
    userErrors {
      field
      message
    }
  }
}
```

### Orders

#### Get Orders

```graphql
query getOrders($first: Int!, $query: String) {
  orders(first: $first, query: $query) {
    edges {
      node {
        id
        name
        email
        totalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        lineItems(first: 10) {
          edges {
            node {
              title
              quantity
              originalUnitPriceSet {
                shopMoney {
                  amount
                }
              }
            }
          }
        }
        createdAt
        fulfillmentStatus
        financialStatus
      }
    }
  }
}
```

#### Update Order

```graphql
mutation orderUpdate($input: OrderInput!) {
  orderUpdate(input: $input) {
    order {
      id
      name
    }
    userErrors {
      field
      message
    }
  }
}
```

### Customers

#### Get Customers

```graphql
query getCustomers($first: Int!) {
  customers(first: $first) {
    edges {
      node {
        id
        email
        firstName
        lastName
        ordersCount
        totalSpent
        createdAt
      }
    }
  }
}
```

#### Create Customer

```graphql
mutation customerCreate($input: CustomerInput!) {
  customerCreate(input: $input) {
    customer {
      id
      email
    }
    userErrors {
      field
      message
    }
  }
}
```

### Inventory

#### Get Inventory Levels

```graphql
query getInventoryLevels($first: Int!) {
  inventoryLevels(first: $first) {
    edges {
      node {
        id
        available
        location {
          id
          name
        }
        item {
          id
          sku
        }
      }
    }
  }
}
```

#### Update Inventory

```graphql
mutation inventorySetOnHandQuantities($input: InventorySetOnHandQuantitiesInput!) {
  inventorySetOnHandQuantities(input: $input) {
    inventoryAdjustmentGroup {
      reason
      changes {
        name
        delta
      }
    }
    userErrors {
      field
      message
    }
  }
}
```

---

## GraphQL Queries

### Pagination

Shopify uses cursor-based pagination:

```typescript
async function getAllProducts() {
  let hasNextPage = true;
  let cursor = null;
  const allProducts = [];

  while (hasNextPage) {
    const query = `
      query getProducts($first: Int!, $after: String) {
        products(first: $first, after: $after) {
          edges {
            node {
              id
              title
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const variables = {
      first: 50,
      after: cursor,
    };

    const data = await adminClient.request(query, variables);
    allProducts.push(...data.products.edges.map(edge => edge.node));
    
    hasNextPage = data.products.pageInfo.hasNextPage;
    cursor = data.products.pageInfo.endCursor;
  }

  return allProducts;
}
```

### Filtering

Use query strings for filtering:

```graphql
query getProductsByVendor($first: Int!, $query: String!) {
  products(first: $first, query: $query) {
    edges {
      node {
        id
        title
        vendor
      }
    }
  }
}
```

**Variables:**
```typescript
{
  first: 50,
  query: "vendor:RITAMIE AND product_type:Jewelry"
}
```

---

## GraphQL Mutations

### Bulk Operations

For large operations, use bulk mutations:

```graphql
mutation bulkOperationRunMutation($mutation: String!, $stagedUploadPath: String) {
  bulkOperationRunMutation(mutation: $mutation, stagedUploadPath: $stagedUploadPath) {
    bulkOperation {
      id
      status
      errorCode
      createdAt
      completedAt
      objectCount
      fileSize
      url
      partialDataUrl
    }
    userErrors {
      field
      message
    }
  }
}
```

### Polling Bulk Operations

```graphql
query getBulkOperation($id: ID!) {
  node(id: $id) {
    ... on BulkOperation {
      id
      status
      errorCode
      createdAt
      completedAt
      objectCount
      fileSize
      url
      partialDataUrl
    }
  }
}
```

---

## Error Handling

### User Errors

GraphQL mutations return `userErrors` array:

```typescript
const mutation = `
  mutation productCreate($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const response = await adminClient.request(mutation, variables);

if (response.productCreate.userErrors.length > 0) {
  const errors = response.productCreate.userErrors;
  throw new Error(`Product creation failed: ${errors.map(e => e.message).join(', ')}`);
}
```

### HTTP Errors

```typescript
try {
  const response = await adminClient.request(query, variables);
  return response;
} catch (error) {
  if (error.response) {
    // HTTP error (4xx, 5xx)
    console.error('HTTP Error:', error.response.status, error.response.errors);
    throw new Error(`Admin API Error: ${error.response.errors[0]?.message}`);
  } else {
    // Network or other error
    console.error('Request Error:', error);
    throw error;
  }
}
```

### Rate Limit Handling

```typescript
async function adminRequestWithRetry(query: string, variables: any, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await adminClient.request(query, variables);
    } catch (error) {
      if (error.response?.status === 429) {
        // Rate limited
        const retryAfter = error.response.headers['retry-after'] || 2;
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## Rate Limiting

Shopify Admin API has rate limits:

- **REST API**: 2 requests per second per store (leaky bucket)
- **GraphQL API**: 1000 points per second (cost-based)

### Cost Calculation

GraphQL operations have different costs:
- Simple query: 1 point
- Complex query: 2-10 points
- Mutation: 10 points
- Bulk operation: 1 point per object

### Best Practices

1. **Batch Operations**: Use bulk mutations for multiple updates
2. **Cache Results**: Cache frequently accessed data
3. **Use Webhooks**: Subscribe to webhooks instead of polling
4. **Implement Retry Logic**: Handle rate limit errors gracefully

---

## Best Practices

### 1. Security

- ✅ **Never expose Admin API tokens** to frontend
- ✅ **Use server-side only** for Admin API calls
- ✅ **Store tokens securely** in environment variables
- ✅ **Implement role-based access** for admin routes
- ✅ **Validate user permissions** before operations

### 2. Performance

- ✅ **Use pagination** for large datasets
- ✅ **Batch operations** when possible
- ✅ **Cache frequently accessed data**
- ✅ **Use webhooks** instead of polling
- ✅ **Monitor rate limits**

### 3. Error Handling

- ✅ **Check userErrors** in mutation responses
- ✅ **Handle rate limits** with retry logic
- ✅ **Log errors** for debugging
- ✅ **Provide user-friendly error messages**

### 4. Code Organization

```typescript
// lib/shopify/admin/
├── client.ts              # Admin API client
├── queries/
│   ├── products.ts        # Product queries
│   ├── orders.ts          # Order queries
│   └── customers.ts       # Customer queries
├── mutations/
│   ├── products.ts        # Product mutations
│   ├── orders.ts          # Order mutations
│   └── customers.ts       # Customer mutations
└── services/
    ├── product.service.ts # Product service
    ├── order.service.ts  # Order service
    └── customer.service.ts # Customer service
```

### 5. Type Safety

Define TypeScript types for all operations:

```typescript
// types/shopify-admin.ts

export interface AdminProduct {
  id: string;
  title: string;
  handle: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'DRAFT';
  variants: AdminVariant[];
}

export interface AdminVariant {
  id: string;
  title: string;
  price: string;
  inventoryQuantity: number;
  sku: string;
}
```

---

## References

### Official Documentation

- [Shopify Admin API GraphQL Reference](https://shopify.dev/docs/api/admin-graphql/latest)
- [Shopify Admin API REST Reference](https://shopify.dev/docs/api/admin-rest)
- [Getting Started with Admin API](https://shopify.dev/docs/apps/admin)
- [Authentication Guide](https://shopify.dev/docs/apps/auth)

### API Versions

- Current version: `2024-01`
- [Version History](https://shopify.dev/docs/api/admin-graphql/latest)
- Always use the latest stable version

### Libraries

- [Shopify API Library for Node.js](https://github.com/Shopify/shopify-api-js)
- [GraphQL Request](https://github.com/jasonkuhrt/graphql-request)

### Rate Limits

- [Understanding Rate Limits](https://shopify.dev/docs/api/usage/rate-limits)
- [GraphQL Cost Calculator](https://shopify.dev/docs/api/admin-graphql/latest/objects/Query)

### Webhooks

- [Webhook Events](https://shopify.dev/docs/api/admin-graphql/latest/enums/WebhookSubscriptionTopic)
- [Webhook Setup Guide](https://shopify.dev/docs/apps/webhooks)

---

## Example: Complete Product Service

```typescript
// lib/shopify/admin/services/product.service.ts

import { adminClient } from '../client';
import { AdminProduct } from '@/types/shopify-admin';

const GET_PRODUCTS_QUERY = `
  query getProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node {
          id
          title
          handle
          description
          status
          vendor
          productType
          variants(first: 10) {
            edges {
              node {
                id
                title
                price
                sku
                inventoryQuantity
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const CREATE_PRODUCT_MUTATION = `
  mutation productCreate($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
        title
        handle
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export class AdminProductService {
  async getProducts(first = 50, after?: string): Promise<{
    products: AdminProduct[];
    hasNextPage: boolean;
    cursor: string | null;
  }> {
    const data = await adminClient.request(GET_PRODUCTS_QUERY, {
      first,
      after,
    });

    return {
      products: data.products.edges.map(edge => edge.node),
      hasNextPage: data.products.pageInfo.hasNextPage,
      cursor: data.products.pageInfo.endCursor,
    };
  }

  async getAllProducts(): Promise<AdminProduct[]> {
    const allProducts: AdminProduct[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;

    while (hasNextPage) {
      const result = await this.getProducts(50, cursor);
      allProducts.push(...result.products);
      hasNextPage = result.hasNextPage;
      cursor = result.cursor;
    }

    return allProducts;
  }

  async createProduct(input: {
    title: string;
    description?: string;
    vendor?: string;
    productType?: string;
    variants?: Array<{
      price: string;
      inventoryQuantities?: Array<{
        availableQuantity: number;
        locationId: string;
      }>;
    }>;
  }): Promise<AdminProduct> {
    const response = await adminClient.request(CREATE_PRODUCT_MUTATION, {
      input,
    });

    if (response.productCreate.userErrors.length > 0) {
      const errors = response.productCreate.userErrors;
      throw new Error(
        `Product creation failed: ${errors.map(e => e.message).join(', ')}`
      );
    }

    return response.productCreate.product;
  }
}

export const adminProductService = new AdminProductService();
```

---

## Next Steps

1. ✅ Set up environment variables
2. ✅ Create Admin API client
3. ✅ Implement product operations
4. ✅ Implement order operations
5. ✅ Implement customer operations
6. ✅ Add error handling and retry logic
7. ✅ Set up webhooks for real-time updates
8. ✅ Add rate limit monitoring
9. ✅ Create API routes for admin operations
10. ✅ Add authentication/authorization for admin routes

---

**Last Updated**: 2024-01
**API Version**: 2024-01

