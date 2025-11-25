# Frontend Hooks Guide

Complete reference for all React hooks available in this project. Use these hooks in client components for data fetching, state management, and UI interactions.

## Table of Contents

1. [Product Hooks](#product-hooks)
2. [Cart Hooks](#cart-hooks)
3. [Authentication Hooks](#authentication-hooks)
4. [Search Hooks](#search-hooks)
5. [Collection Hooks](#collection-hooks)
6. [Shop Hooks](#shop-hooks)
7. [Recommendation Hooks](#recommendation-hooks)
8. [Filter Hooks](#filter-hooks)
9. [UI Hooks](#ui-hooks)
10. [Best Practices](#best-practices)

---

## Product Hooks

### `useProducts()`

Fetch and manage a list of products.

**Location:** `hooks/useProducts.ts`

**Usage:**
```typescript
import { useProducts } from '@/hooks/useProducts';

const { products, loading, error, refetch } = useProducts(initialProducts);
```

**Parameters:**
- `initialProducts` (optional): `Product[]` - Initial products array (for SSR)

**Returns:**
```typescript
{
  products: Product[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}
```

**Example:**
```typescript
'use client';

import { useProducts } from '@/hooks/useProducts';

export default function ProductList() {
  const { products, loading, error, refetch } = useProducts();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <button onClick={refetch}>Refresh</button>
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

---

### `useProduct(handle)`

Fetch a single product by handle.

**Location:** `hooks/useProduct.ts`

**Usage:**
```typescript
import { useProduct } from '@/hooks/useProduct';

const { product, loading, error, refetch } = useProduct('product-handle');
```

**Parameters:**
- `handle`: `string | null` - Product handle (slug)

**Returns:**
```typescript
{
  product: Product | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}
```

**Example:**
```typescript
'use client';

import { useProduct } from '@/hooks/useProduct';
import { useParams } from 'next/navigation';

export default function ProductPage() {
  const params = useParams();
  const handle = params.handle as string;
  const { product, loading, error } = useProduct(handle);

  if (loading) return <div>Loading product...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!product) return <div>Product not found</div>;

  return (
    <div>
      <h1>{product.title}</h1>
      <p>{product.description}</p>
    </div>
  );
}
```

---

## Cart Hooks

### `useCart()`

Manage shopping cart operations.

**Location:** `hooks/useCart.ts`

**Usage:**
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

**Returns:**
```typescript
{
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  addToCart: (variantId: string, quantity?: number) => Promise<string | null>;
  updateQuantity: (lineId: string, quantity: number) => Promise<void>;
  removeItem: (lineId: string) => Promise<void>;
  applyDiscount: (code: string) => Promise<void>;
  removeDiscount: () => Promise<void>;
  getCart: () => Promise<void>;
  clearCart: () => Promise<void>;
}
```

**Example:**
```typescript
'use client';

import { useCart } from '@/hooks/useCart';

export default function CartPage() {
  const {
    cart,
    loading,
    addToCart,
    updateQuantity,
    removeItem
  } = useCart();

  const handleAddItem = async () => {
    const checkoutUrl = await addToCart('variant-id', 1);
    if (checkoutUrl) {
      console.log('Added to cart!');
    }
  };

  return (
    <div>
      {cart?.lines.map(line => (
        <div key={line.id}>
          <span>{line.merchandise.product.title}</span>
          <input
            type="number"
            value={line.quantity}
            onChange={(e) => updateQuantity(line.id, parseInt(e.target.value))}
          />
          <button onClick={() => removeItem(line.id)}>Remove</button>
        </div>
      ))}
    </div>
  );
}
```

**Features:**
- Automatically persists cart ID in `localStorage`
- Fetches cart on mount if cart ID exists
- Updates cart state after operations

---

## Authentication Hooks

### `useAuth()`

Manage customer authentication and account operations.

**Location:** `hooks/useAuth.ts`

**Usage:**
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

**Returns:**
```typescript
{
  customer: Customer | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string, phone?: string) => Promise<{ success: boolean; requiresVerification?: boolean; message?: string }>;
  updateProfile: (data: { firstName?: string; lastName?: string; email?: string; phone?: string }) => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<boolean>;
  resetPassword: (resetUrl: string, password: string) => Promise<boolean>;
  createAddress: (address: AddressInput) => Promise<boolean>;
  updateAddress: (addressId: string, address: AddressInput) => Promise<boolean>;
  deleteAddress: (addressId: string) => Promise<boolean>;
  refreshCustomer: () => Promise<void>;
}
```

**Example:**
```typescript
'use client';

import { useAuth } from '@/hooks/useAuth';

export default function AccountPage() {
  const {
    customer,
    isAuthenticated,
    loading,
    login,
    logout,
    updateProfile
  } = useAuth();

  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }

  return (
    <div>
      <h1>Welcome, {customer?.firstName}!</h1>
      <p>Email: {customer?.email}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

**Features:**
- Automatically fetches customer data on mount
- Manages authentication state
- Handles email verification flow
- Provides address management

---

## Search Hooks

### `useSearch()`

Search for products.

**Location:** `hooks/useSearch.ts`

**Usage:**
```typescript
import { useSearch } from '@/hooks/useSearch';

const { results, loading, error, search, clearResults } = useSearch();
```

**Returns:**
```typescript
{
  results: Product[];
  loading: boolean;
  error: string | null;
  search: (query: string, first?: number) => Promise<void>;
  clearResults: () => void;
}
```

**Example:**
```typescript
'use client';

import { useState } from 'react';
import { useSearch } from '@/hooks/useSearch';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const { results, loading, search, clearResults } = useSearch();

  const handleSearch = async () => {
    if (query.trim()) {
      await search(query, 10);
    } else {
      clearResults();
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

## Collection Hooks

### `useCollections()`

Fetch and manage collections.

**Location:** `hooks/useCollections.ts`

**Usage:**
```typescript
import { useCollections } from '@/hooks/useCollections';

const { collections, loading, error, refetch } = useCollections(initialCollections);
```

**Parameters:**
- `initialCollections` (optional): `CollectionInfo[]` - Initial collections array

**Returns:**
```typescript
{
  collections: CollectionInfo[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}
```

**Example:**
```typescript
'use client';

import { useCollections } from '@/hooks/useCollections';

export default function CollectionsList() {
  const { collections, loading } = useCollections();

  return (
    <div>
      {collections.map(collection => (
        <Link key={collection.id} href={`/collections/${collection.handle}`}>
          {collection.title}
        </Link>
      ))}
    </div>
  );
}
```

---

### `useCollectionProducts()`

Fetch products by collection handle.

**Location:** `hooks/useCollectionProducts.ts`

**Usage:**
```typescript
import { useCollectionProducts } from '@/hooks/useCollectionProducts';

const { products, loading, error, fetchProducts } = useCollectionProducts();

useEffect(() => {
  fetchProducts('diamonds', 250);
}, []);
```

**Returns:**
```typescript
{
  products: Product[];
  loading: boolean;
  error: string | null;
  fetchProducts: (collectionHandle: string, first?: number) => Promise<void>;
}
```

**Example:**
```typescript
'use client';

import { useEffect } from 'react';
import { useCollectionProducts } from '@/hooks/useCollectionProducts';
import { useParams } from 'next/navigation';

export default function CollectionPage() {
  const params = useParams();
  const handle = params.handle as string;
  const { products, loading, fetchProducts } = useCollectionProducts();

  useEffect(() => {
    if (handle) {
      fetchProducts(handle, 250);
    }
  }, [handle, fetchProducts]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

---

## Shop Hooks

### `useShop()`

Fetch shop information and menus.

**Location:** `hooks/useShop.ts`

**Usage:**
```typescript
import { useShop } from '@/hooks/useShop';

const { shop, menu, loading, error, fetchShop, fetchMenu } = useShop();
```

**Returns:**
```typescript
{
  shop: Shop | null;
  menu: Menu | null;
  loading: boolean;
  error: string | null;
  fetchShop: () => Promise<void>;
  fetchMenu: (handle: string) => Promise<void>;
}
```

**Example:**
```typescript
'use client';

import { useEffect } from 'react';
import { useShop } from '@/hooks/useShop';

export default function ShopInfo() {
  const { shop, menu, loading, fetchShop, fetchMenu } = useShop();

  useEffect(() => {
    fetchShop();
    fetchMenu('main-menu');
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>{shop?.name}</h1>
      <p>{shop?.description}</p>
      {menu && (
        <nav>
          {menu.items.map(item => (
            <a key={item.id} href={item.url}>{item.title}</a>
          ))}
        </nav>
      )}
    </div>
  );
}
```

---

## Recommendation Hooks

### `useRecommendations(productId)`

Fetch product recommendations.

**Location:** `hooks/useRecommendations.ts`

**Usage:**
```typescript
import { useRecommendations } from '@/hooks/useRecommendations';

const { recommendations, loading, error, fetchRecommendations } = useRecommendations();

useEffect(() => {
  if (productId) {
    fetchRecommendations(productId);
  }
}, [productId]);
```

**Returns:**
```typescript
{
  recommendations: Product[];
  loading: boolean;
  error: string | null;
  fetchRecommendations: (productId: string) => Promise<void>;
}
```

**Example:**
```typescript
'use client';

import { useEffect } from 'react';
import { useRecommendations } from '@/hooks/useRecommendations';

export default function ProductRecommendations({ productId }: { productId: string }) {
  const { recommendations, loading, fetchRecommendations } = useRecommendations();

  useEffect(() => {
    fetchRecommendations(productId);
  }, [productId, fetchRecommendations]);

  if (loading) return <div>Loading recommendations...</div>;

  return (
    <div>
      <h2>You may also like</h2>
      {recommendations.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

---

## Filter Hooks

### `useDiamondFilters()`

Manage diamond filter state.

**Location:** `hooks/useDiamondFilters.ts`

**Usage:**
```typescript
import { useDiamondFilters } from '@/hooks/useDiamondFilters';

const { filters, setFilter, updateFilters, resetFilters, filteredProducts } = useDiamondFilters(products);
```

**Parameters:**
- `products`: `Product[]` - Products to filter

**Returns:**
```typescript
{
  filters: DiamondFilters;
  setFilter: (key: keyof DiamondFilters, value: any) => void;
  updateFilters: (newFilters: Partial<DiamondFilters>) => void;
  resetFilters: () => void;
  filteredProducts: Product[];
}
```

**Example:**
```typescript
'use client';

import { useDiamondFilters } from '@/hooks/useDiamondFilters';
import { useProducts } from '@/hooks/useProducts';

export default function DiamondFilters() {
  const { products } = useProducts();
  const { filters, setFilter, filteredProducts } = useDiamondFilters(products);

  return (
    <div>
      <select
        value={filters.shape || ''}
        onChange={(e) => setFilter('shape', e.target.value)}
      >
        <option value="">All Shapes</option>
        <option value="Round">Round</option>
        <option value="Oval">Oval</option>
      </select>
      <div>
        {filteredProducts.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
```

---

### `useJewelryFilters()`

Manage jewelry filter state.

**Location:** `hooks/useJewelryFilters.ts`

**Usage:**
```typescript
import { useJewelryFilters } from '@/hooks/useJewelryFilters';

const { filters, setFilter, updateFilters, resetFilters, filteredProducts } = useJewelryFilters(products);
```

**Parameters:**
- `products`: `Product[]` - Products to filter

**Returns:**
```typescript
{
  filters: JewelryFilters;
  setFilter: (key: keyof JewelryFilters, value: any) => void;
  updateFilters: (newFilters: Partial<JewelryFilters>) => void;
  resetFilters: () => void;
  filteredProducts: Product[];
}
```

---

## UI Hooks

### `useMediaGallery()`

Manage product media gallery (images/videos).

**Location:** `hooks/useMediaGallery.ts`

**Usage:**
```typescript
import { useMediaGallery } from '@/hooks/useMediaGallery';

const { media, selectedIndex, selectedMedia, selectMedia, next, previous } = useMediaGallery(productMedia);
```

**Parameters:**
- `productMedia`: `Media[]` - Array of media items

**Returns:**
```typescript
{
  media: Media[];
  selectedIndex: number;
  selectedMedia: Media | null;
  selectMedia: (index: number) => void;
  next: () => void;
  previous: () => void;
}
```

**Example:**
```typescript
'use client';

import { useMediaGallery } from '@/hooks/useMediaGallery';
import { getProductMedia } from '@/utils/transformers/product-transformer';

export default function ProductGallery({ product }: { product: Product }) {
  const media = getProductMedia(product);
  const { selectedMedia, next, previous, selectMedia } = useMediaGallery(media);

  return (
    <div>
      <img src={selectedMedia?.url} alt={product.title} />
      <button onClick={previous}>Previous</button>
      <button onClick={next}>Next</button>
      <div>
        {media.map((item, index) => (
          <button key={index} onClick={() => selectMedia(index)}>
            <img src={item.url} alt="" />
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

### `useViewMode()`

Manage view mode toggle (grid/table).

**Location:** `hooks/useViewMode.ts`

**Usage:**
```typescript
import { useViewMode } from '@/hooks/useViewMode';

const { viewMode, setViewMode, toggleViewMode } = useViewMode();
```

**Returns:**
```typescript
{
  viewMode: 'grid' | 'table';
  setViewMode: (mode: 'grid' | 'table') => void;
  toggleViewMode: () => void;
}
```

**Example:**
```typescript
'use client';

import { useViewMode } from '@/hooks/useViewMode';
import { LayoutGrid, Table2 } from 'lucide-react';

export default function ViewToggle() {
  const { viewMode, toggleViewMode } = useViewMode();

  return (
    <button onClick={toggleViewMode}>
      {viewMode === 'grid' ? <Table2 /> : <LayoutGrid />}
    </button>
  );
}
```

---

### `useModal()`

Manage modal open/close state.

**Location:** `hooks/useModal.ts`

**Usage:**
```typescript
import { useModal } from '@/hooks/useModal';

const { isOpen, open, close, toggle } = useModal();
```

**Returns:**
```typescript
{
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}
```

**Example:**
```typescript
'use client';

import { useModal } from '@/hooks/useModal';

export default function ProductModal() {
  const { isOpen, open, close } = useModal();

  return (
    <>
      <button onClick={open}>View Details</button>
      {isOpen && (
        <div className="modal">
          <button onClick={close}>Close</button>
          <div>Product details...</div>
        </div>
      )}
    </>
  );
}
```

---

### `useIntersectionObserver()`

Observe element visibility for lazy loading or animations.

**Location:** `hooks/useIntersectionObserver.ts`

**Usage:**
```typescript
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

const { ref, isIntersecting } = useIntersectionObserver({
  threshold: 0.1,
  rootMargin: '50px'
});
```

**Parameters:**
```typescript
{
  threshold?: number;
  rootMargin?: string;
  root?: Element | null;
}
```

**Returns:**
```typescript
{
  ref: (node: Element | null) => void;
  isIntersecting: boolean;
}
```

**Example:**
```typescript
'use client';

import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

export default function LazyImage({ src, alt }: { src: string; alt: string }) {
  const { ref, isIntersecting } = useIntersectionObserver();

  return (
    <div ref={ref}>
      {isIntersecting && <img src={src} alt={alt} />}
    </div>
  );
}
```

---

### `useSliderFilter()`

Manage slider filter values (for price, carat, etc.).

**Location:** `hooks/useSliderFilter.ts`

**Usage:**
```typescript
import { useSliderFilter } from '@/hooks/useSliderFilter';

const { value, setValue, reset } = useSliderFilter([min, max], [initialMin, initialMax]);
```

**Parameters:**
- `range`: `[number, number]` - Min/max range
- `initialValue`: `[number, number]` - Initial values

**Returns:**
```typescript
{
  value: [number, number];
  setValue: (newValue: [number, number]) => void;
  reset: () => void;
}
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

### 4. Use Initial Data for SSR

```typescript
// Server component
export default async function ProductsPage() {
  const products = await productsService.getProducts();
  return <ProductsClient initialProducts={products} />;
}

// Client component
'use client';
export default function ProductsClient({ initialProducts }: { initialProducts: Product[] }) {
  const { products } = useProducts(initialProducts);
  // Uses initialProducts, no loading state needed
}
```

### 5. Memoize Expensive Computations

```typescript
import { useMemo } from 'react';

const filteredProducts = useMemo(() => {
  return products.filter(p => p.price > 100);
}, [products]);
```

### 6. Clean Up Effects

```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    // Do something
  }, 1000);

  return () => clearTimeout(timer);
}, []);
```

### 7. Combine Hooks

```typescript
const { products } = useProducts();
const { filters, filteredProducts } = useDiamondFilters(products);
const { viewMode } = useViewMode();
```

---

## Hook Return Types

All hook return types are defined in `types/hook.types.ts`:

```typescript
export interface UseProductsReturn { ... }
export interface UseProductReturn { ... }
export interface UseCartReturn { ... }
export interface UseAuthReturn { ... }
export interface UseSearchReturn { ... }
export interface UseCollectionsReturn { ... }
export interface UseCollectionProductsReturn { ... }
export interface UseShopReturn { ... }
export interface UseRecommendationsReturn { ... }
export interface UseDiamondFiltersReturn { ... }
export interface UseJewelryFiltersReturn { ... }
export interface UseMediaGalleryReturn { ... }
export interface UseViewModeReturn { ... }
export interface UseModalReturn { ... }
```

---

## Common Patterns

### Fetching Data on Mount

```typescript
useEffect(() => {
  fetchData();
}, [fetchData]);
```

### Fetching Data on Parameter Change

```typescript
useEffect(() => {
  if (handle) {
    fetchProduct(handle);
  }
}, [handle, fetchProduct]);
```

### Debounced Search

```typescript
import { useDebounce } from 'use-debounce'; // or similar library

const [query, setQuery] = useState('');
const [debouncedQuery] = useDebounce(query, 300);
const { results, search } = useSearch();

useEffect(() => {
  if (debouncedQuery) {
    search(debouncedQuery);
  }
}, [debouncedQuery, search]);
```

---

## Troubleshooting

### Hook Not Updating

- Check if dependencies are correct in `useEffect`
- Verify API route is returning data
- Check browser console for errors

### Infinite Loop

- Ensure `useEffect` dependencies are correct
- Use `useCallback` for functions passed as dependencies

### Type Errors

- Import correct types from `@/types/hook.types`
- Check hook return type matches usage

---

## Additional Resources

- [React Hooks Documentation](https://react.dev/reference/react)
- [Frontend API Guide](./FRONTEND_API_GUIDE.md) - For API endpoint details
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

