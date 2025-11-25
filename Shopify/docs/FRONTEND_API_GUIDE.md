# Frontend API Guide

Complete guide for frontend developers and UX/UI designers working with the Shopify Storefront API.

## Table of Contents

1. [Overview](#overview)
2. [Using Hooks vs Direct API Calls](#using-hooks-vs-direct-api-calls)
3. [Product APIs](#product-apis)
4. [Cart APIs](#cart-apis)
5. [Customer & Authentication APIs](#customer--authentication-apis)
6. [Search APIs](#search-apis)
7. [Collection APIs](#collection-apis)
8. [Error Handling](#error-handling)
9. [Best Practices](#best-practices)

---

## Overview

This application uses **Shopify Storefront API** via Next.js API routes. All API calls go through `/app/api/*` routes which handle server-side communication with Shopify.

### Available Hooks

For client-side components, **always use hooks** instead of direct API calls:

- `useProducts()` - Fetch and manage products
- `useProduct(handle)` - Fetch single product
- `useCart()` - Cart operations
- `useAuth()` - Authentication and customer management
- `useSearch()` - Product search
- `useCollections()` - Fetch collections
- `useCollectionProducts()` - Fetch products by collection
- `useShop()` - Shop information and menus
- `useRecommendations(productId)` - Product recommendations

### API Base URL

All API routes are relative to your domain:
- Development: `http://localhost:3000/api/*`
- Production: `https://yourdomain.com/api/*`

---

## Using Hooks vs Direct API Calls

### ✅ **Use Hooks (Recommended for Client Components)**

Hooks provide:
- Automatic state management
- Loading and error states
- TypeScript type safety
- Optimized re-renders

```typescript
'use client';

import { useProducts } from '@/hooks/useProducts';

export default function ProductList() {
  const { products, loading, error, refetch } = useProducts();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

### ⚠️ **Direct API Calls (Server Components Only)**

Only use direct API calls in server components (files without `'use client'`):

```typescript
// app/products/page.tsx (Server Component)
import { productsService } from '@/services/shopify/products.service';

export default async function ProductsPage() {
  const products = await productsService.getProducts(250);
  return <ProductList products={products} />;
}
```

---

## Product APIs

### Get All Products

**Hook:** `useProducts()`

```typescript
import { useProducts } from '@/hooks/useProducts';

const { products, loading, error, refetch } = useProducts();
```

**API Endpoint:** `GET /api/products`

**Response:**
```typescript
Product[] // Array of products
```

**Product Type:**
```typescript
interface Product {
  id: string;
  title: string;
  handle: string;
  description: string;
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  images: {
    edges: Array<{
      node: {
        url: string;
        altText: string | null;
      };
    }>;
  };
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        price: {
          amount: string;
          currencyCode: string;
        };
        availableForSale: boolean;
      };
    }>;
  };
  metafields: Array<{
    namespace: string;
    key: string;
    value: string;
    type: string;
  }>;
}
```

### Get Single Product

**Hook:** `useProduct(handle)`

```typescript
import { useProduct } from '@/hooks/useProduct';

const { product, loading, error, refetch } = useProduct('product-handle');
```

**API Endpoint:** `GET /api/products/[handle]`

**Example:**
```typescript
// Fetch product by handle
const { product } = useProduct('round-diamond-ring');
```

### Search Products

**Hook:** `useSearch()`

```typescript
import { useSearch } from '@/hooks/useSearch';

const { results, loading, error, search, clearResults } = useSearch();

// Search for products
await search('diamond ring', 10);
```

**API Endpoint:** `GET /api/search?q={query}&first={limit}`

**Parameters:**
- `q` (string) - Search query
- `first` (number, optional) - Limit results (default: 10)

**Example:**
```typescript
const SearchComponent = () => {
  const { results, loading, search } = useSearch();

  const handleSearch = async (query: string) => {
    await search(query, 20); // Search with limit of 20
  };

  return (
    <div>
      <input onChange={(e) => handleSearch(e.target.value)} />
      {results.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};
```

### Product Recommendations

**Hook:** `useRecommendations(productId)`

```typescript
import { useRecommendations } from '@/hooks/useRecommendations';

const { recommendations, loading, error, fetchRecommendations } = useRecommendations();

useEffect(() => {
  if (productId) {
    fetchRecommendations(productId);
  }
}, [productId]);
```

**API Endpoint:** `GET /api/recommendations/[productId]`

---

## Cart APIs

### Cart Hook

**Hook:** `useCart()`

```typescript
import { useCart } from '@/hooks/useCart';

const {
  cart,
  loading,
  error,
  addToCart,
  updateQuantity,
  removeItem,
  applyDiscount,
  removeDiscount,
  getCart,
  clearCart
} = useCart();
```

### Add to Cart

```typescript
// Add item to cart
const checkoutUrl = await addToCart(variantId, quantity);
// Returns checkout URL or null
```

**API Endpoint:** `POST /api/cart`

**Request Body:**
```typescript
{
  variantId: string;
  quantity?: number; // Default: 1
}
```

**Response:**
```typescript
{
  cartId: string;
  checkoutUrl: string;
  cart: Cart;
}
```

### Get Cart

```typescript
// Fetch current cart
await getCart();
```

**API Endpoint:** `GET /api/cart?id={cartId}`

**Response:**
```typescript
{
  cart: {
    id: string;
    checkoutUrl: string;
    totalQuantity: number;
    cost: {
      totalAmount: { amount: string; currencyCode: string };
      subtotalAmount: { amount: string; currencyCode: string };
    };
    lines: Array<{
      id: string;
      quantity: number;
      merchandise: {
        id: string;
        title: string;
        price: { amount: string; currencyCode: string };
        product: {
          id: string;
          title: string;
          handle: string;
          images: Array<{ url: string; altText: string }>;
        };
      };
      cost: { totalAmount: { amount: string; currencyCode: string } };
    }>;
    discountCodes: Array<{ code: string; applicable: boolean }>;
  };
}
```

### Update Cart Item Quantity

```typescript
await updateQuantity(lineId, newQuantity);
```

**API Endpoint:** `PUT /api/cart/items`

**Request Body:**
```typescript
{
  cartId: string;
  lines: Array<{
    id: string; // Cart line ID
    quantity: number;
  }>;
}
```

### Remove Cart Item

```typescript
await removeItem(lineId);
```

**API Endpoint:** `DELETE /api/cart/items?id={cartId}&lineIds={lineId}`

### Apply Discount Code

```typescript
await applyDiscount('DISCOUNT10');
```

**API Endpoint:** `POST /api/cart/discount`

**Request Body:**
```typescript
{
  cartId: string;
  discountCodes: string[]; // Array of discount codes
}
```

### Remove Discount Code

```typescript
await removeDiscount();
```

**API Endpoint:** `DELETE /api/cart/discount?id={cartId}`

### Complete Cart Example

```typescript
'use client';

import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';

export default function CartPage() {
  const {
    cart,
    loading,
    addToCart,
    updateQuantity,
    removeItem,
    applyDiscount
  } = useCart();

  if (loading) return <div>Loading cart...</div>;
  if (!cart) return <div>Cart is empty</div>;

  return (
    <div>
      <h1>Shopping Cart</h1>
      {cart.lines.map(line => (
        <div key={line.id}>
          <h3>{line.merchandise.product.title}</h3>
          <p>${line.cost.totalAmount.amount}</p>
          <input
            type="number"
            value={line.quantity}
            onChange={(e) => updateQuantity(line.id, parseInt(e.target.value))}
          />
          <button onClick={() => removeItem(line.id)}>Remove</button>
        </div>
      ))}
      <div>
        <p>Total: ${cart.cost.totalAmount.amount}</p>
        <a href={cart.checkoutUrl}>Checkout</a>
      </div>
    </div>
  );
}
```

---

## Customer & Authentication APIs

### Authentication Hook

**Hook:** `useAuth()`

```typescript
import { useAuth } from '@/hooks/useAuth';

const {
  customer,
  isAuthenticated,
  loading,
  error,
  login,
  logout,
  register,
  updateProfile,
  requestPasswordReset,
  resetPassword,
  createAddress,
  updateAddress,
  deleteAddress,
  refreshCustomer
} = useAuth();
```

### Register New Customer

```typescript
const result = await register(
  'user@example.com',
  'password123',
  'John',
  'Doe',
  '+1234567890' // Optional phone
);

if (result.success) {
  if (result.requiresVerification) {
    // Show email verification message
    console.log(result.message);
  } else {
    // User is logged in
    console.log('Registration successful!');
  }
}
```

**API Endpoint:** `POST /api/auth/register`

**Request Body:**
```typescript
{
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string; // Must start with + (e.g., +1234567890)
}
```

**Response:**
```typescript
{
  success: boolean;
  requiresVerification?: boolean;
  message?: string;
  customer?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}
```

### Login

```typescript
const success = await login('user@example.com', 'password123');

if (success) {
  // User is logged in, customer data is available
  console.log('Login successful!');
}
```

**API Endpoint:** `POST /api/auth/login`

**Request Body:**
```typescript
{
  email: string;
  password: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  customer?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  error?: string;
  requiresVerification?: boolean;
}
```

### Logout

```typescript
await logout();
```

**API Endpoint:** `POST /api/auth/logout`

### Get Current Customer

The `useAuth()` hook automatically fetches customer data on mount. Access it via:

```typescript
const { customer, isAuthenticated } = useAuth();

if (isAuthenticated && customer) {
  console.log(customer.email);
  console.log(customer.orders); // Array of orders
  console.log(customer.addresses); // Array of addresses
}
```

**API Endpoint:** `GET /api/auth/me`

### Update Profile

```typescript
const success = await updateProfile({
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'newemail@example.com',
  phone: '+1987654321'
});
```

**API Endpoint:** `PUT /api/auth/profile`

**Request Body:**
```typescript
{
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}
```

### Password Reset

**Request Reset:**
```typescript
await requestPasswordReset('user@example.com');
// Always returns success (for security)
```

**API Endpoint:** `POST /api/auth/forgot-password`

**Reset Password:**
```typescript
const success = await resetPassword(resetUrl, 'newPassword123');
```

**API Endpoint:** `POST /api/auth/reset-password`

**Request Body:**
```typescript
{
  resetUrl: string; // From email link
  password: string;
}
```

### Address Management

**Create Address:**
```typescript
const success = await createAddress({
  firstName: 'John',
  lastName: 'Doe',
  address1: '123 Main St',
  address2: 'Apt 4B',
  city: 'New York',
  province: 'NY',
  country: 'United States',
  zip: '10001',
  phone: '+1234567890'
});
```

**API Endpoint:** `POST /api/account/addresses`

**Update Address:**
```typescript
const success = await updateAddress(addressId, {
  address1: '456 Oak Ave',
  city: 'Los Angeles',
  // ... other fields
});
```

**API Endpoint:** `PUT /api/account/addresses`

**Request Body:**
```typescript
{
  addressId: string;
  firstName?: string;
  lastName?: string;
  address1: string;
  address2?: string;
  city: string;
  province?: string;
  country: string;
  zip: string;
  phone?: string;
}
```

**Delete Address:**
```typescript
const success = await deleteAddress(addressId);
```

**API Endpoint:** `DELETE /api/account/addresses?id={addressId}`

---

## Search APIs

### Search Hook

**Hook:** `useSearch()`

```typescript
import { useSearch } from '@/hooks/useSearch';

const { results, loading, error, search, clearResults } = useSearch();

// Perform search
await search('diamond ring', 20);

// Clear results
clearResults();
```

**API Endpoint:** `GET /api/search?q={query}&first={limit}`

**Example Implementation:**
```typescript
'use client';

import { useState } from 'react';
import { useSearch } from '@/hooks/useSearch';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const { results, loading, search } = useSearch();

  const handleSearch = async () => {
    if (query.trim()) {
      await search(query, 10);
    }
  };

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
      />
      <button onClick={handleSearch}>Search</button>
      {loading && <div>Searching...</div>}
      {results.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

---

## Collection APIs

### Get Collections

**Hook:** `useCollections()`

```typescript
import { useCollections } from '@/hooks/useCollections';

const { collections, loading, error, refetch } = useCollections();
```

**API Endpoint:** `GET /api/collections`

**Response:**
```typescript
{
  collections: Array<{
    id: string;
    title: string;
    handle: string;
  }>;
}
```

### Get Products by Collection

**Hook:** `useCollectionProducts()`

```typescript
import { useCollectionProducts } from '@/hooks/useCollectionProducts';

const { products, loading, error, fetchProducts } = useCollectionProducts();

useEffect(() => {
  fetchProducts('diamonds', 250);
}, []);
```

**API Endpoint:** `GET /api/collections/[handle]/products?first={limit}`

---

## Error Handling

### Hook Error States

All hooks provide `error` state:

```typescript
const { products, loading, error } = useProducts();

if (error) {
  return <div>Error: {error}</div>;
}
```

### API Error Responses

All API endpoints return errors in this format:

```typescript
{
  error: string; // Error message
  details?: string; // Additional error details
}
```

**HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (account disabled, needs verification)
- `404` - Not Found
- `500` - Server Error

### Example Error Handling

```typescript
const handleAddToCart = async () => {
  try {
    const checkoutUrl = await addToCart(variantId, 1);
    if (!checkoutUrl) {
      // Handle error
      setError('Failed to add item to cart');
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Unknown error');
  }
};
```

---

## Best Practices

### 1. Always Use Hooks in Client Components

```typescript
// ✅ Good
'use client';
import { useProducts } from '@/hooks/useProducts';

// ❌ Bad - Direct API call in client component
'use client';
const response = await fetch('/api/products');
```

### 2. Handle Loading States

```typescript
const { products, loading } = useProducts();

if (loading) {
  return <LoadingSpinner />;
}
```

### 3. Handle Error States

```typescript
const { products, error } = useProducts();

if (error) {
  return <ErrorMessage message={error} />;
}
```

### 4. Use TypeScript Types

```typescript
import { Product } from '@/types/shopify';
import { Cart } from '@/types/api.types';
import { Customer } from '@/services/shopify/customer.service';
```

### 5. Optimize Re-renders

```typescript
// Use useMemo for expensive computations
const filteredProducts = useMemo(() => {
  return products.filter(p => p.priceRange.minVariantPrice.amount > '100');
}, [products]);
```

### 6. Cart Persistence

The cart ID is automatically stored in `localStorage`. The `useCart()` hook handles this automatically.

### 7. Authentication State

The `useAuth()` hook automatically:
- Fetches customer data on mount
- Manages authentication state
- Handles token refresh

### 8. Search Debouncing

For search inputs, implement debouncing:

```typescript
import { useDebounce } from '@/hooks/useDebounce'; // If available
// Or use a library like lodash.debounce

const debouncedSearch = useMemo(
  () => debounce((query: string) => search(query, 10), 300),
  [search]
);
```

---

## Component Integration Examples

### Product List Component

```typescript
'use client';

import { useProducts } from '@/hooks/useProducts';
import ProductCard from '@/components/modules/ProductCard';

export default function ProductList() {
  const { products, loading, error } = useProducts();

  if (loading) return <div>Loading products...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

### Add to Cart Button

```typescript
'use client';

import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function AddToCartButton({ variantId }: { variantId: string }) {
  const { addToCart, loading } = useCart();
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    setAdding(true);
    try {
      await addToCart(variantId, 1);
      // Show success message
    } finally {
      setAdding(false);
    }
  };

  return (
    <Button onClick={handleAdd} disabled={loading || adding}>
      {adding ? 'Adding...' : 'Add to Cart'}
    </Button>
  );
}
```

### Login Form

```typescript
'use client';

import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginForm() {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) {
      // Redirect or show success
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <Input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <Button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </Button>
    </form>
  );
}
```

---

## Type Definitions

All types are available from:

```typescript
// Product types
import { Product } from '@/types/shopify';

// Cart types
import { Cart, CartLine } from '@/types/api.types';

// Customer types
import { Customer, CustomerAddress, AddressInput } from '@/services/shopify/customer.service';

// Hook return types
import { UseProductsReturn, UseCartReturn, UseAuthReturn } from '@/types/hook.types';
```

---

## Additional Resources

- [Shopify Storefront API Documentation](https://shopify.dev/docs/api/storefront)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [React Hooks Documentation](https://react.dev/reference/react)

---

## Support

For questions or issues:
1. Check the error message in the browser console
2. Review the API response in Network tab
3. Check server logs for detailed error information
4. Refer to the API guides in `docs/` for available endpoints

