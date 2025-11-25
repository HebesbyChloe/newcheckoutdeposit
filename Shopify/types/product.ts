import { Collection } from "./collection";

// Product-related types
export interface Metafield {
  key: string;
  value: string;
  namespace: string;
}

export interface MediaImage {
  mediaContentType: "IMAGE";
  image: {
    url: string;
    altText: string | null;
  };
}

export interface Video {
  mediaContentType: "VIDEO";
  sources: Array<{
    url: string;
    mimeType: string;
  }>;
}

export type Media = MediaImage | Video;

export interface ProductVariant {
  id: string;
  title: string;
  price: {
    amount: string;
    currencyCode: string;
  };
  compareAtPrice?: {
    amount: string;
    currencyCode: string;
  } | null;
  availableForSale: boolean;
}

export interface ProductImage {
  url: string;
  altText: string | null;
}

export interface Product {
  id: string;
  title: string;
  handle: string;
  description: string;
  priceRange?: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  images?: {
    edges: Array<{
      node: ProductImage;
    }>;
  };
  media?: {
    edges: Array<{
      node: Media;
    }>;
  };
  variants?: {
    edges: Array<{
      node: ProductVariant;
    }>;
  };
  collections?: {
    edges: Array<{
      node: Collection;
    }>;
  };
  metafields?: Metafield[] | {
    edges: Array<{
      node: Metafield;
    }>;
  };
}

export interface DiamondSpecs {
  shape: string;
  carat: number;
  cut: string;
  color: string;
  clarity: string;
  gradingLab: string;
  origin: 'natural' | 'lab' | null;
}

// Re-export helper functions from utils/shopify/product-helpers.ts for backward compatibility
export {
  getMetafield,
  getProductOrigin,
  getDiamondSpecs,
} from "@/utils/shopify/product-helpers";
