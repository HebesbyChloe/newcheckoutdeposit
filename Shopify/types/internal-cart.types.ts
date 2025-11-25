// Internal cart types - app-owned cart, independent of Shopify

export type InternalCartItemSource = 'shopify' | 'external';

export interface InternalCartItemAttribute {
  key: string;
  value: string;
}

export interface InternalCartItemPrice {
  amount: string;
  currencyCode: string;
}

export interface InternalCartItem {
  // Internal line ID
  id: string;
  // Where this item comes from
  source: InternalCartItemSource;
  // For native Shopify products
  variantId?: string;
  productHandle?: string;
  // For external feed diamonds
  externalId?: string;
  // Display
  title: string;
  imageUrl: string;
  // Quantity and pricing
  quantity: number;
  price: InternalCartItemPrice;
  // Line attributes (Storefront properties equivalent)
  attributes?: InternalCartItemAttribute[];
  // Optional raw payload for external items (full diamond data)
  payload?: Record<string, any>;
}

export interface InternalCart {
  id: string;
  items: InternalCartItem[];
  createdAt: number;
  updatedAt: number;
}


